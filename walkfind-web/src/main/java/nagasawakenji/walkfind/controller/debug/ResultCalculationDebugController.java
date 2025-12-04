package nagasawakenji.walkfind.controller.debug;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.CalculationResult;
import nagasawakenji.walkfind.service.ResultCalculationService;
import nagasawakenji.walkfind.service.UserProfileRankUpdateService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Set;

/**
 * ローカル検証用：結果集計と best_rank 更新を手動実行するデバッグ用コントローラー
 * ※ 本番では無効化すること
 */
@RestController
@RequestMapping("/api/debug/results")
@RequiredArgsConstructor
@Slf4j
public class ResultCalculationDebugController {

    private final ResultCalculationService resultCalculationService;
    private final UserProfileRankUpdateService userProfileRankUpdateService;

    /**
     * 終了済みコンテストの結果集計と best_rank 更新を一括実行
     *
     * POST /api/debug/results/calculate
     */
    @PostMapping("/calculate")
    public ResponseEntity<?> calculateAndUpdateRanks() {

        log.warn("DEBUG API invoked: calculate contest results and update best_rank.");

        // ① 結果集計を実行（戻り値は集計対象の contestId 一覧）
        List<CalculationResult> calculationResults =
                resultCalculationService.calculateAllClosedContests();

        // ② 各コンテストごとに best_rank を更新
        for (CalculationResult result: calculationResults) {
            userProfileRankUpdateService.updateBestRanksForContest(result.getContestId());
        }

        String contestIds = calculationResults.stream()
                .map(result -> String.valueOf(result.getContestId()))
                .distinct()
                .collect(java.util.stream.Collectors.joining(", "));

        return ResponseEntity.ok().body(
                "Result calculation & rank update completed. contests=" + contestIds
        );
    }
}
