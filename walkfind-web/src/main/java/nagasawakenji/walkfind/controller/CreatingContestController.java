package nagasawakenji.walkfind.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.CreatingContestRequest;
import nagasawakenji.walkfind.domain.dto.CreatingContestResponse;
import nagasawakenji.walkfind.domain.statusenum.CreationContestStatus;
import nagasawakenji.walkfind.exception.DatabaseOperationException;
import nagasawakenji.walkfind.service.CreatingContestService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/v1/creating")
@Slf4j
@RequiredArgsConstructor
public class CreatingContestController {

    private final CreatingContestService creatingContestService;

    @PostMapping
    public ResponseEntity<CreatingContestResponse> createContest(
            @RequestBody CreatingContestRequest request
    ) {

        CreatingContestResponse response =
                creatingContestService.createContest(
                        request.getName(),
                        request.getTheme(),
                        request.getStartDate(),
                        request.getEndDate()
                );

        return switch (response.getStatus()) {
            case SUCCESS ->
                    ResponseEntity.status(HttpStatus.CREATED).body(response);

            case NAME_DUPLICATED ->
                    ResponseEntity.status(HttpStatus.CONFLICT).body(response);

            case INVALID_DATE ->
                    ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(response);

            case FAILED ->
                    ResponseEntity.badRequest().body(response);

            default ->
                    ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        };
    }

    /**
     * データベース例外など、Service層からスローされたRuntimeExceptionを捕捉する
     */
    @ExceptionHandler({RuntimeException.class, DatabaseOperationException.class})
    public ResponseEntity<CreatingContestResponse> handleInternalErrors(Exception ex) {
        log.error("Unhandled Internal Error during photo submission.", ex);

        CreatingContestResponse errorResult = CreatingContestResponse.builder()
                .contestId(null)
                .status(CreationContestStatus.INTERNAL_SEVER_ERROR)
                .message("サーバーで予期せぬエラーが発生しました。時間を置いて再度お試しください。")
                .build();

        return new ResponseEntity<>(errorResult, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}

