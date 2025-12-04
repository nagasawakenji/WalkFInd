package nagasawakenji.walkfind.service;

import nagasawakenji.walkfind.domain.dto.CalculationResult;
import nagasawakenji.walkfind.domain.model.Contest;
import nagasawakenji.walkfind.domain.model.ContestResult;
import nagasawakenji.walkfind.domain.statusenum.ContestStatus;
import nagasawakenji.walkfind.domain.model.UserPhoto; // 順位決定に必要な情報を格納するDTO/Model
import nagasawakenji.walkfind.domain.statusenum.CalculationStatus;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestMapper;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestResultMapper;
import nagasawakenji.walkfind.infra.mybatis.mapper.PhotoMapper;
import nagasawakenji.walkfind.infra.mybatis.mapper.VoteMapper;
import nagasawakenji.walkfind.exception.DatabaseOperationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResultCalculationService {

    private final ContestMapper contestMapper;
    private final PhotoMapper photoMapper;
    private final ContestResultMapper contestResultMapper;
    private final VoteMapper voteMapper;

    /**
     * 定期実行Lambdaから呼び出される集計処理のメインメソッド。
     * 投稿締め切り(END_DATE)を迎え、かつ未集計のコンテストを全て集計します。
     * * @return 処理結果のリスト
     */
    @Transactional
    public List<CalculationResult> calculateAllClosedContests() {

        // 1. 集計対象のコンテストリストを取得
        // Mapper側で end_date < CURRENT_TIMESTAMP AND status = 'CLOSED_VOTING' をチェック
        List<Contest> targetContests = contestMapper.findContestsNeedingCalculation();

        if (targetContests.isEmpty()) {
            return List.of(CalculationResult.builder()
                    .status(CalculationStatus.NO_CONTESTS_TO_CALCULATE)
                    .message("No contests found that require calculation.")
                    .build());
        }

        return targetContests.stream()
                .map(this::processSingleContestCalculation)
                .collect(Collectors.toList());
    }

    /**
     * 単一のコンテストの結果を集計し、DBに書き込み、ステータスを更新する。
     */
    private CalculationResult processSingleContestCalculation(Contest contest) {
        Long contestId = contest.getId();
        try {
            // 既に集計結果があるかチェック (冪等性担保のため)
            if (contest.getStatus().equals(ContestStatus.ANNOUNCED)) {
                return buildResult(contestId, CalculationStatus.ALREADY_CALCULATED, "Results already calculated.", 0);
            }

            // 投稿を取得（ここでは、集計に必要なIDとtotal_votesを持つUserPhoto Modelを流用）
            List<UserPhoto> submissions = photoMapper.findAllSubmissionsForCalculation(contestId);

            if (submissions.isEmpty()) {
                // コンテストはあったが投稿がゼロの場合
                // statusをANNOUNCEDに更新するのみ
                contestMapper.updateContestStatus(contestId, ContestStatus.ANNOUNCED);
                return buildResult(contestId, CalculationStatus.SUCCESS, "Contest closed, no submissions found.", 0);
            }

            // 順位付け
            List<ContestResult> results = rankSubmissions(submissions, contestId);

            // 結果のDB書き込み (contest_resultsテーブル)
            int insertedCount = contestResultMapper.insertAll(results);

            if (insertedCount != results.size()) {
                throw new DatabaseOperationException("Failed to insert all results.");
            }

            // コンテストステータス更新 (CLOSED_VOTING -> ANNOUNCED)
            // この更新も同じトランザクション内で行う
            contestMapper.updateContestStatus(contestId, ContestStatus.ANNOUNCED);

            log.info("Successfully calculated results for Contest ID {}. Inserted {} records.", contestId, insertedCount);

            return buildResult(contestId, CalculationStatus.SUCCESS, "Calculation complete.", insertedCount);

        } catch (Exception e) {
            log.error("Calculation failed for Contest ID {}.", contestId, e);

            // RuntimeExceptionを再スローし、外側の@Transactionalでロールバックさせる
            if (e instanceof DatabaseOperationException) {
                throw (DatabaseOperationException) e;
            }
            throw new RuntimeException("Unexpected error during calculation.", e);
        }
    }

    /**
     * 投票数に基づいて投稿を順位付けし、ContestResultモデルを生成する。
     */
    private List<ContestResult> rankSubmissions(List<UserPhoto> submissions, Long contestId) {
        // 1. 投票数が多い順にソート
        submissions.sort(Comparator
                .comparing(UserPhoto::getTotalVotes, Comparator.reverseOrder())
                .thenComparing(UserPhoto::getSubmissionDate)); // 投票数が同じなら投稿日時順

        int rank = 0;
        int lastScore = -1;
        int rankOffset = 0; // 同率順位のオフセット

        List<ContestResult> results = new java.util.ArrayList<>();

        for (int i = 0; i < submissions.size(); i++) {
            UserPhoto submission = submissions.get(i);

            if (submission.getTotalVotes() != lastScore) {
                rank = i + 1;
                rankOffset = 0;
            } else {
                // 同率の場合、順位をスキップせず、次の異なるスコアまで同じ順位を維持
                // (例: 1位, 1位, 3位 のジャンケン順位方式)
                rankOffset++;
            }

            results.add(ContestResult.builder()
                    .contestId(contestId)
                    .photoId(submission.getId())
                    .finalRank(rank)
                    .finalScore(submission.getTotalVotes())
                    .isWinner(rank == 1) // 1位は勝者とする
                    .build());

            lastScore = submission.getTotalVotes();
        }

        return results;
    }

    private CalculationResult buildResult(Long contestId, CalculationStatus status, String message, Integer processedCount) {
        return CalculationResult.builder()
                .contestId(contestId)
                .status(status)
                .message(message)
                .photosProcessed(processedCount)
                .build();
    }
}