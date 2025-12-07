package nagasawakenji.walkfind.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.UpdatingContestRequest;
import nagasawakenji.walkfind.domain.dto.UpdatingContestResponse;
import nagasawakenji.walkfind.domain.statusenum.UpdateContestStatus;
import nagasawakenji.walkfind.exception.DatabaseOperationException;
import nagasawakenji.walkfind.service.UpdatingContestService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/contests")
@Slf4j
@RequiredArgsConstructor
public class UpdatingContestController {

    private final UpdatingContestService updatingContestService;

    /**
     * コンテスト情報更新API
     * PUT /api/v1/contests/{contestId}
     */
    @PutMapping("/{contestId}")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<UpdatingContestResponse> updateContest(
            @PathVariable("contestId") Long contestId,
            @RequestBody UpdatingContestRequest request
    ) {

        UpdatingContestResponse response =
                updatingContestService.updateContest(
                        contestId,
                        request.getName(),
                        request.getTheme(),
                        request.getStartDate(),
                        request.getEndDate()
                );

        return switch (response.getStatus()) {
            case SUCCESS ->
                    ResponseEntity.ok(response);

            case NOT_FOUND ->
                    ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);

            case NAME_DUPLICATED ->
                    ResponseEntity.status(HttpStatus.CONFLICT).body(response);

            case INVALID_DATE, BUSINESS_RULE_VIOLATION, FAILED ->
                    ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(response);

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
    public ResponseEntity<UpdatingContestResponse> handleInternalErrors(Exception ex) {
        log.error("Unhandled Internal Error during contest update.", ex);

        UpdatingContestResponse errorResult = UpdatingContestResponse.builder()
                .contestId(null)
                .status(UpdateContestStatus.INTERNAL_SERVER_ERROR)
                .message("サーバーで予期せぬエラーが発生しました。時間を置いて再度お試しください。")
                .build();

        return new ResponseEntity<>(errorResult, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}