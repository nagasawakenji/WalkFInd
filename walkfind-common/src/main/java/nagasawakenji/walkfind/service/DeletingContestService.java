package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.DeletingContestResponse;
import nagasawakenji.walkfind.domain.model.Contest;
import nagasawakenji.walkfind.domain.statusenum.ContestStatus;
import nagasawakenji.walkfind.domain.statusenum.DeleteContestStatus;
import nagasawakenji.walkfind.exception.DatabaseOperationException;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class DeletingContestService {

    private final ContestMapper contestMapper;

    /**
     * (管理者用) コンテスト削除ロジック
     */
    @Transactional
    public DeletingContestResponse deleteContest(Long contestId) {

        // ① 対象コンテスト取得
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

        // ② ビジネスルール: 開催前（UPCOMING）のみ削除可
        if (contest.getStatus() != ContestStatus.UPCOMING) {
            log.warn("Contest delete is not allowed because status={}, contestId={}",
                    contest.getStatus(), contestId);

            return DeletingContestResponse.builder()
                    .contestId(contestId)
                    .status(DeleteContestStatus.BUSINESS_RULE_VIOLATION)
                    .message("開催前のコンテストのみ削除可能です")
                    .build();
        }

        // ③ DB削除
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
}