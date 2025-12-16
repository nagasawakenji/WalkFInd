package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.UpdatingContestResponse;
import nagasawakenji.walkfind.domain.model.Contest;
import nagasawakenji.walkfind.domain.model.User;
import nagasawakenji.walkfind.domain.statusenum.ContestStatus;
import nagasawakenji.walkfind.domain.statusenum.UpdateContestStatus;
import nagasawakenji.walkfind.domain.statusenum.UserRole;
import nagasawakenji.walkfind.exception.DatabaseOperationException;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestMapper;
import nagasawakenji.walkfind.infra.mybatis.mapper.UserMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class UpdatingContestService {

    private final ContestMapper contestMapper;
    private final UserMapper userMapper;

    /**
     * コンテスト更新ロジック
     * - user: 自分のコンテストのみ編集可 / UPCOMINGのみ編集可
     * - admin: すべて編集可（ただし安全のため、UPCOMING以外は日付変更禁止）
     */
    @Transactional
    public UpdatingContestResponse updateContest(
            Long contestId,
            String requesterUserId,
            String name,
            String theme,
            OffsetDateTime startDate,
            OffsetDateTime endDate
    ) {
        OffsetDateTime now = OffsetDateTime.now();

        // 認証済みユーザーIDの最低限チェック
        if (requesterUserId == null || requesterUserId.isBlank()) {
            return UpdatingContestResponse.builder()
                    .contestId(contestId)
                    .status(UpdateContestStatus.FORBIDDEN)
                    .message("認証情報が取得できませんでした。再ログインしてください。")
                    .build();
        }

        // 対象コンテスト取得（removed_at IS NULL は mapper側で担保済み想定）
        Contest contest = contestMapper.findById(contestId)
                .orElse(null);

        if (contest == null) {
            log.warn("Contest not found. contestId={}", contestId);
            return UpdatingContestResponse.builder()
                    .contestId(contestId)
                    .status(UpdateContestStatus.NOT_FOUND)
                    .message("指定されたコンテストは存在しません")
                    .build();
        }

        // requester の権限判定（DB role）
        boolean isAdmin = isAdminUser(requesterUserId);

        // 認可（owner/admin）チェック
        UpdatingContestResponse authError = authorizeUpdate(contest, requesterUserId, isAdmin);
        if (authError != null) {
            return authError;
        }

        // user は UPCOMING のみ更新可
        if (!isAdmin && contest.getStatus() != ContestStatus.UPCOMING) {
            return UpdatingContestResponse.builder()
                    .contestId(contestId)
                    .status(UpdateContestStatus.BUSINESS_RULE_VIOLATION)
                    .name(contest.getName())
                    .theme(contest.getTheme())
                    .message("開催前のコンテストのみ編集可能です")
                    .build();
        }

        // adminは全編集可にするが、UPCOMING 以外は日付変更だけ禁止（要件に応じて調整）
        if (isAdmin && contest.getStatus() != ContestStatus.UPCOMING) {
            boolean startChanged = !startDate.isEqual(contest.getStartDate());
            boolean endChanged = !endDate.isEqual(contest.getEndDate());
            if (startChanged || endChanged) {
                return UpdatingContestResponse.builder()
                        .contestId(contestId)
                        .status(UpdateContestStatus.BUSINESS_RULE_VIOLATION)
                        .name(contest.getName())
                        .theme(contest.getTheme())
                        .message("開催中/終了後のコンテストは日付を変更できません（名称/テーマのみ変更可能）")
                        .build();
            }
            // 日付はそのまま扱う
        }

        // nameの重複（自分自身除外 + removed_at IS NULL を mapper側で担保済み想定）
        if (!contest.getName().equals(name) && contestMapper.isExistContestByName(name)) {
            return UpdatingContestResponse.builder()
                    .contestId(contestId)
                    .status(UpdateContestStatus.NAME_DUPLICATED)
                    .name(name)
                    .theme(theme)
                    .message("コンテスト名が重複しています")
                    .build();
        }

        // 日付バリデーション：UPCOMINGのときのみ実施（現状いらないが、一応実装しておきます)
        if (contest.getStatus() == ContestStatus.UPCOMING) {
            UpdatingContestResponse dateError = validateDates(now, contestId, name, theme, startDate, endDate);
            if (dateError != null) {
                return dateError;
            }
        }

        // 更新反映
        contest.setName(name);
        contest.setTheme(theme);

        // UPCOMING のときだけ日付を更新（adminがそれ以外で日付変更禁止なため）
        if (contest.getStatus() == ContestStatus.UPCOMING) {
            contest.setStartDate(startDate);
            contest.setEndDate(endDate);
        }

        // DB更新
        try {
            int updated = contestMapper.update(contest);
            if (updated == 0) {
                throw new DatabaseOperationException("コンテスト情報の更新に失敗しました。");
            }
            return mapToUpdatingContestResponse(contest);

        } catch (DatabaseOperationException e) {
            throw e;
        } catch (Exception e) {
            log.error("Database error during contest update. contestId={}", contestId, e);
            throw new RuntimeException("DB処理中に予期せぬエラーが発生しました。", e);
        }
    }

    private UpdatingContestResponse authorizeUpdate(Contest contest, String requesterUserId, boolean isAdmin) {
        String ownerUserId = contest.getCreatedByUserId();

        // created_by が NULL の既存データは admin のみ編集可（安全側）
        if (ownerUserId == null) {
            if (!isAdmin) {
                return UpdatingContestResponse.builder()
                        .contestId(contest.getId())
                        .status(UpdateContestStatus.FORBIDDEN)
                        .name(contest.getName())
                        .theme(contest.getTheme())
                        .message("このコンテストを編集する権限がありません")
                        .build();
            }
            return null;
        }

        // owner一致 or admin
        if (!isAdmin && !ownerUserId.equals(requesterUserId)) {
            log.warn("Contest update forbidden. contestId={}, requesterUserId={}, ownerUserId={}",
                    contest.getId(), requesterUserId, ownerUserId);

            return UpdatingContestResponse.builder()
                    .contestId(contest.getId())
                    .status(UpdateContestStatus.FORBIDDEN)
                    .name(contest.getName())
                    .theme(contest.getTheme())
                    .message("このコンテストを編集する権限がありません")
                    .build();
        }

        return null;
    }

    private UpdatingContestResponse validateDates(
            OffsetDateTime now,
            Long contestId,
            String name,
            String theme,
            OffsetDateTime startDate,
            OffsetDateTime endDate
    ) {
        if (startDate.isBefore(now)) {
            return UpdatingContestResponse.builder()
                    .contestId(contestId)
                    .status(UpdateContestStatus.INVALID_DATE)
                    .name(name)
                    .theme(theme)
                    .message("開始日は現在より後にしてください")
                    .build();
        }

        if (!endDate.isAfter(startDate)) {
            return UpdatingContestResponse.builder()
                    .contestId(contestId)
                    .status(UpdateContestStatus.INVALID_DATE)
                    .name(name)
                    .theme(theme)
                    .message("終了日は開始日より後に設定してください")
                    .build();
        }

        return null;
    }

    private UpdatingContestResponse mapToUpdatingContestResponse(Contest contest) {
        return UpdatingContestResponse.builder()
                .contestId(contest.getId())
                .status(UpdateContestStatus.SUCCESS)
                .name(contest.getName())
                .theme(contest.getTheme())
                .message("コンテスト情報を更新しました")
                .build();
    }

    private boolean isAdminUser(String userId) {
        try {
            Optional<User> userOpt = userMapper.findById(userId);
            if (userOpt.isEmpty()) {
                return false;
            }
            UserRole role = userOpt.get().getRole();
            return role != null && role.equals(UserRole.ADMIN);

        } catch (Exception e) {
            // 認可判定でのDBエラーは安全側に倒す
            log.error("Failed to determine admin role. userId={}", userId, e);
            return false;
        }
    }
}