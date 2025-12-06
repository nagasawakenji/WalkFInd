package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.UpdatingContestResponse;
import nagasawakenji.walkfind.domain.model.Contest;
import nagasawakenji.walkfind.domain.statusenum.ContestStatus;
import nagasawakenji.walkfind.domain.statusenum.UpdateContestStatus;
import nagasawakenji.walkfind.exception.DatabaseOperationException;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class UpdatingContestService {

    private final ContestMapper contestMapper;

    /**
     * (管理者用) コンテスト更新ロジック
     */
    @Transactional
    public UpdatingContestResponse updateContest(
            Long contestId,
            String name,
            String theme,
            OffsetDateTime startDate,
            OffsetDateTime endDate
    ) {
        OffsetDateTime now = OffsetDateTime.now();

        // ① 対象コンテスト取得
        Optional<Contest> contestOpt = contestMapper.findById(contestId);
        if (contestOpt.isEmpty()) {
            log.warn("Contest not found. contestId={}", contestId);
            return UpdatingContestResponse.builder()
                    .contestId(contestId)
                    .status(UpdateContestStatus.NOT_FOUND)
                    .message("指定されたコンテストは存在しません")
                    .build();
        }

        Contest contest = contestOpt.get();

        // ② ビジネスルール: 開催前（UPCOMING）のみ更新可
        if (contest.getStatus() != ContestStatus.UPCOMING) {
            log.warn("Contest update is not allowed because status={}, contestId={}",
                    contest.getStatus(), contestId);

            return UpdatingContestResponse.builder()
                    .contestId(contestId)
                    .status(UpdateContestStatus.BUSINESS_RULE_VIOLATION)
                    .name(contest.getName())
                    .theme(contest.getTheme())
                    .message("開催前のコンテストのみ編集可能です")
                    .build();
        }

        // ③ name の重複確認（自分自身は除外）
        if (!contest.getName().equals(name) && contestMapper.isExistContestByName(name)) {
            return UpdatingContestResponse.builder()
                    .contestId(contestId)
                    .status(UpdateContestStatus.NAME_DUPLICATED)
                    .name(name)
                    .theme(theme)
                    .message("コンテスト名が重複しています")
                    .build();
        }

        // ④ 開始時間,終了時間確認
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

        // ⑤ 更新内容の反映
        contest.setName(name);
        contest.setTheme(theme);
        contest.setStartDate(startDate);
        contest.setEndDate(endDate);

        try {
            int updated = contestMapper.update(contest);

            if (updated == 0) {
                log.error("DB update failed for unknown reason. contestId={}", contestId);
                throw new DatabaseOperationException("コンテスト情報の更新に失敗しました。");
            }

            return mapToUpdatingContestResponse(contest);

        } catch (DatabaseOperationException e) {
            // 自前で投げた例外はそのまま再スローしてロールバック
            throw e;
        } catch (Exception e) {
            // 想定外のエラーはラップして再スロー
            log.error("Database error during contest update. contestId={}", contestId, e);
            throw new RuntimeException("DB処理中に予期せぬエラーが発生しました。", e);
        }
    }

    // UpdatingContestResponse 作成ヘルパー
    private UpdatingContestResponse mapToUpdatingContestResponse(Contest contest) {
        return UpdatingContestResponse.builder()
                .contestId(contest.getId())
                .status(UpdateContestStatus.SUCCESS)
                .name(contest.getName())
                .theme(contest.getTheme())
                .message("コンテスト情報を更新しました")
                .build();
    }
}