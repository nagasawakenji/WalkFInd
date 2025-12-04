package nagasawakenji.walkfind.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.ContestResultListResponse;
import nagasawakenji.walkfind.domain.dto.ContestResultResponse;
import nagasawakenji.walkfind.domain.dto.ContestWinnerDto;
import nagasawakenji.walkfind.domain.dto.ContestWinnerListResponse;
import nagasawakenji.walkfind.exception.ContestNotFoundException;
import nagasawakenji.walkfind.exception.ContestStatusException;
import nagasawakenji.walkfind.service.LocalStorageDownloadService;
import nagasawakenji.walkfind.service.ResultDisplayService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URL;

@RestController
@Slf4j
@RequiredArgsConstructor
@RequestMapping("/api/v1/results") // ★ 結果リソースとして /results に修正
public class ContestResultController {

    private final ResultDisplayService resultDisplayService;
    private final LocalStorageDownloadService localStorageDownloadService;

    /**
     * GET /api/v1/results/{contestId} : 終了したコンテストの結果を順位順で表示（認証不要）
     */
    @GetMapping("/{contestId}")
    public ResponseEntity<ContestResultListResponse> getContestResults(@PathVariable("contestId") Long contestId,
                                                                         @RequestParam(value = "page", defaultValue = "0") int page,
                                                                         @RequestParam(value = "size", defaultValue = "20") int size) {

        ContestResultListResponse response = resultDisplayService.getFinalResults(contestId, page, size);
        handlePhotoUrl(response);

        // 結果が空の場合でも 200 OK と空リストを返す (コンテストは存在するが投稿がなかった場合など)
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/v1/results/{contestId}/winner : 終了したコンテストの優勝作品を表示(認証不要)
     */
    @GetMapping("/{contestId}/winner")
    public ResponseEntity<ContestWinnerListResponse> getContestWinner(@PathVariable("contestId") Long contestId) {

       ContestWinnerListResponse response = resultDisplayService.getFinalWinners(contestId);
       handleWinnerPhotoUrl(response);

       return ResponseEntity.ok(response);
    }

    /**
     * カスタム例外ハンドラー: ContestNotFoundException, ContestStatusExceptionを捕捉
     */
    @ExceptionHandler({ContestNotFoundException.class, ContestStatusException.class})
    public ResponseEntity<String> handleStatusInvalid(RuntimeException ex) {

        // 1. ContestNotFoundExceptionの処理 (HTTP 404 Not Found)
        if (ex instanceof ContestNotFoundException) {
            log.warn("Result request failed: Contest not found. ID={}", ((ContestNotFoundException) ex).getErrorCode());
            return new ResponseEntity<>(ex.getMessage(), HttpStatus.NOT_FOUND); // 404
        }

        // 2. ContestStatusExceptionの処理 (HTTP 403 Forbidden / 400 Bad Request)
        if (ex instanceof ContestStatusException) {
            ContestStatusException cse = (ContestStatusException) ex;
            log.warn("Result request denied due to contest status. Code: {}", cse.getErrorCode());

            // NOT_READY (集計中/期間中) の場合は、リクエストが早すぎることを示唆する 403 Forbidden
            if ("NOT_READY".equals(cse.getErrorCode())) {
                return new ResponseEntity<>(cse.getMessage(), HttpStatus.FORBIDDEN); // 403
            }

            // その他のステータスエラー（例：管理者操作が必要なエラー）は 400
            return new ResponseEntity<>(cse.getMessage(), HttpStatus.BAD_REQUEST); // 400
        }

        // 念のため、上記以外の RuntimeException は 500 を返す (本来はグローバルハンドラーで処理)
        log.error("Unexpected runtime exception in result controller.", ex);
        return new ResponseEntity<>("Internal Server Error.", HttpStatus.INTERNAL_SERVER_ERROR);
    }


    /**
     * photoUrl をローカルストレージのダウンロードURLに変換
     */
    private void handlePhotoUrl(ContestResultListResponse response) {
        response.getContestResultResponses().forEach(result -> {
            if (result.getPhotoUrl() != null && !result.getPhotoUrl().isBlank()) {
                URL url = localStorageDownloadService.generatedDownloadUrl(result.getPhotoUrl());
                result.setPhotoUrl(url.toString());
            }
        });
    }

    /**
     * 優勝作品一覧の photoUrl をローカルストレージのダウンロードURLに変換
     */
    private void handleWinnerPhotoUrl(ContestWinnerListResponse response) {
        response.getWinners().forEach(winner -> {
            if (winner.getPhotoUrl() != null && !winner.getPhotoUrl().isBlank()) {
                URL url = localStorageDownloadService.generatedDownloadUrl(winner.getPhotoUrl());
                winner.setPhotoUrl(url.toString());
            }
        });
    }
}