package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.DeletingContestResponse;
import nagasawakenji.walkfind.domain.model.Contest;
import nagasawakenji.walkfind.domain.model.User;
import nagasawakenji.walkfind.domain.statusenum.ContestStatus;
import nagasawakenji.walkfind.domain.statusenum.DeleteContestStatus;
import nagasawakenji.walkfind.domain.statusenum.UserRole;
import nagasawakenji.walkfind.exception.DatabaseOperationException;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestMapper;
import nagasawakenji.walkfind.infra.mybatis.mapper.UserMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class DeletingContestService {

    private final ContestMapper contestMapper;
    private final UserMapper userMapper;

    /**
     *コンテスト削除ロジック
     */
    @Transactional
    public DeletingContestResponse deleteContest(Long contestId, String requesterUserId) {

        // 認証済みユーザーIDの最低限チェック
        if (requesterUserId == null || requesterUserId.isBlank()) {
            return DeletingContestResponse.builder()
                    .contestId(contestId)
                    .status(DeleteContestStatus.FORBIDDEN)
                    .message("認証情報が取得できませんでした。再ログインしてください。")
                    .build();
        }

        // 対象コンテスト取得
        Optional<Contest> contestOpt = contestMapper.findById(contestId);
        if (contestOpt.isEmpty()) {
            log.warn("Contest not found. contestId={}", contestId);
            return DeletingContestResponse.builder()
                    .contestId(contestId)
                    .status(DeleteContestStatus.NOT_FOUND)
                    .message("指定されたコンテストは存在しません")
                    .build();
        }

        Contest contest = contestOpt.get();

        // 権限判定（DB role）
        boolean isAdmin = isAdminUser(requesterUserId);

        // admin は常にOK / user は作成者のみ削除可
        DeletingContestResponse authError = authorizeDelete(contest, requesterUserId, isAdmin);
        if (authError != null) {
            return authError;
        }

        // user は開催前（UPCOMING）のみ削除可 / admin はステータスに関わらず削除可
        if (!isAdmin && contest.getStatus() != ContestStatus.UPCOMING) {
            log.warn("Contest delete is not allowed because status={}, contestId={}",
                    contest.getStatus(), contestId);

            return DeletingContestResponse.builder()
                    .contestId(contestId)
                    .status(DeleteContestStatus.BUSINESS_RULE_VIOLATION)
                    .message("開催前のコンテストのみ削除可能です")
                    .build();
        }

        // DB削除
        try {
            int deleted = contestMapper.deleteById(contestId);

            if (deleted == 0) {
                log.error("DB delete failed for unknown reason. contestId={}", contestId);
                throw new DatabaseOperationException("コンテストの削除に失敗しました。");
            }

            return DeletingContestResponse.builder()
                    .contestId(contestId)
                    .status(DeleteContestStatus.SUCCESS)
                    .message("コンテストを削除しました")
                    .build();

        } catch (DatabaseOperationException e) {
            // 自前で投げた例外はそのまま再スローしてロールバック
            throw e;
        } catch (Exception e) {
            log.error("Database error during contest delete. contestId={}", contestId, e);
            throw new RuntimeException("DB処理中に予期せぬエラーが発生しました。", e);
        }
    }

    private DeletingContestResponse authorizeDelete(Contest contest, String requesterUserId, boolean isAdmin) {
        String ownerUserId = contest.getCreatedByUserId();
        log.info("ownerUserId is {}", ownerUserId);

        // created_by_user_id がNULLの既存データは admin のみ削除可（安全側）
        if (ownerUserId == null) {
            if (!isAdmin) {
                return DeletingContestResponse.builder()
                        .contestId(contest.getId())
                        .status(DeleteContestStatus.FORBIDDEN)
                        .message("このコンテストを削除する権限がありません")
                        .build();
            }
            return null;
        }

        // owner一致 or admin
        if (!isAdmin && !ownerUserId.equals(requesterUserId)) {
            log.warn("Contest delete forbidden. contestId={}, requesterUserId={}, ownerUserId={}",
                    contest.getId(), requesterUserId, ownerUserId);

            return DeletingContestResponse.builder()
                    .contestId(contest.getId())
                    .status(DeleteContestStatus.FORBIDDEN)
                    .message("このコンテストを削除する権限がありません")
                    .build();
        }

        return null;
    }

    private boolean isAdminUser(String userId) {
        if (userId == null || userId.isBlank()) {
            return false;
        }

        try {
            Optional<User> userOpt = userMapper.findById(userId);
            if (userOpt.isEmpty()) {
                return false;
            }

            User user = userOpt.get();
            UserRole role = user.getRole();
            return role != null && role.equals(UserRole.ADMIN);

        } catch (Exception e) {
            // 認可判定でのDBエラーは安全側に倒す
            log.error("Failed to determine admin role. userId={}", userId, e);
            return false;
        }
    }
}