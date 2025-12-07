package nagasawakenji.walkfind.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.DeletingContestResponse;
import nagasawakenji.walkfind.domain.statusenum.DeleteContestStatus;
import nagasawakenji.walkfind.exception.DatabaseOperationException;
import nagasawakenji.walkfind.service.DeletingContestService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/contests")
@Slf4j
@RequiredArgsConstructor
public class DeletingContestController {

    private final DeletingContestService deletingContestService;

    /**
     * コンテスト削除API
     * DELETE /api/v1/contests/{contestId}
     */
    @PreAuthorize("hasRole('admin')")
    @DeleteMapping("/{contestId}")
    public ResponseEntity<DeletingContestResponse> deleteContest(
            @PathVariable("contestId") Long contestId
    ) {
        DeletingContestResponse response = deletingContestService.deleteContest(contestId);

        return switch (response.getStatus()) {
            case SUCCESS ->
                    ResponseEntity.ok(response);

            case NOT_FOUND ->
                    ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);

            case BUSINESS_RULE_VIOLATION ->
                    ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(response);

            case FAILED ->
                    ResponseEntity.badRequest().body(response);

            case INTERNAL_SERVER_ERROR ->
                    ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);

            default ->
                    ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        };
    }

    /**
     * データベース例外など、Service層からスローされたRuntimeExceptionを捕捉する
     */
    @ExceptionHandler({RuntimeException.class, DatabaseOperationException.class})
    public ResponseEntity<DeletingContestResponse> handleInternalErrors(Exception ex) {
        log.error("Unhandled Internal Error during contest delete.", ex);

        DeletingContestResponse errorResult = DeletingContestResponse.builder()
                .contestId(null)
                .status(DeleteContestStatus.INTERNAL_SERVER_ERROR)
                .message("サーバーで予期せぬエラーが発生しました。時間を置いて再度お試しください。")
                .build();

        return new ResponseEntity<>(errorResult, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}