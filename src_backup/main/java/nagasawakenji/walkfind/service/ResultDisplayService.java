package nagasawakenji.walkfind.service;

import nagasawakenji.walkfind.domain.dto.ContestResultResponse;
import nagasawakenji.walkfind.domain.statusenum.ContestStatus;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestMapper;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestResultMapper;
import nagasawakenji.walkfind.exception.ContestNotFoundException;
import nagasawakenji.walkfind.exception.ContestStatusException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResultDisplayService {

    private final ContestMapper contestMapper;
    private final ContestResultMapper contestResultMapper;

    /**
     * 特定のコンテストの最終結果リストを順位順で取得する。
     *
     * @param contestId 結果表示対象のコンテストID
     * @return 確定結果のリスト (ContestResultResponse DTO)
     */
    @Transactional(readOnly = true)
    public List<ContestResultResponse> getFinalResults(Long contestId) {

        // コンテストの存在確認とステータス取得
        ContestStatus status = contestMapper.findContestStatus(contestId)
                .orElseThrow(() -> new ContestNotFoundException("Contest with ID " + contestId + " not found.", "NOT_FOUND"))
                .getStatus();

        // 結果発表ステータスのチェック
        // CLOSED_VOTING (集計完了) または ANNOUNCED (発表済) でなければ表示不可
        if (status != ContestStatus.CLOSED_VOTING && status != ContestStatus.ANNOUNCED) {
            log.warn("Attempt to access results for Contest ID {} with status: {}", contestId, status);
            throw new ContestStatusException("Results are not yet ready for display. Current status: " + status.name(), "NOT_READY");
        }

        // DBから確定結果を取得
        List<ContestResultResponse> results = contestResultMapper.findDetailedResultsByContestId(contestId);

        if (results.isEmpty()) {
            log.warn("Contest ID {} is closed but results table is empty. Check calculation log.", contestId);
        }

        return results;
    }
}