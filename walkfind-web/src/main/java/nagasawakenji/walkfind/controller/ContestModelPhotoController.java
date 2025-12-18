package nagasawakenji.walkfind.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.ContestModelPhotoCreateRequest;
import nagasawakenji.walkfind.domain.dto.ContestModelPhotoListResponse;
import nagasawakenji.walkfind.domain.statusenum.ContestModelPhotoCreateStatus;
import nagasawakenji.walkfind.exception.DatabaseOperationException;
import nagasawakenji.walkfind.service.AuthService;
import nagasawakenji.walkfind.service.ContestModelPhotoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/contests/{contestId}/modelPhoto")
@Slf4j
@RequiredArgsConstructor
public class ContestModelPhotoController {

    private final ContestModelPhotoService contestModelPhotoService;
    private final AuthService authService;

    @PostMapping
    public ResponseEntity<ContestModelPhotoListResponse> create(
            @PathVariable("contestId") Long contestId,
            @Valid @RequestPart("request") ContestModelPhotoCreateRequest request,
            @RequestPart("file") MultipartFile file
    ) {
        String userId = authService.getAuthenticatedUserId();

        ContestModelPhotoListResponse res =
                contestModelPhotoService.create(contestId, userId, request, file);

        return switch (res.getStatus()) {
            case SUCCESS ->
                    ResponseEntity.status(HttpStatus.CREATED).body(res);

            case CONTEST_NOT_FOUND, MODEL_PHOTO_NOT_FOUND ->
                    ResponseEntity.status(HttpStatus.NOT_FOUND).body(res);

            case FORBIDDEN ->
                    ResponseEntity.status(HttpStatus.FORBIDDEN).body(res);

            case INVALID_REQUEST ->
                    ResponseEntity.badRequest().body(res);

            default ->
                    ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(res);
        };
    }

    @GetMapping
    public ResponseEntity<ContestModelPhotoListResponse> list(
            @PathVariable("contestId") Long contestId
    ) {
        // 一覧は誰でも取得OK想定（制限したいならAuthServiceでuserId取ってチェックを追加）
        ContestModelPhotoListResponse res = contestModelPhotoService.list(contestId);
        return ResponseEntity.ok(res);
    }

    @DeleteMapping("/{modelPhotoId}")
    public ResponseEntity<ContestModelPhotoListResponse> delete(
            @PathVariable("contestId") Long contestId,
            @PathVariable Long modelPhotoId
    ) {
        String userId = authService.getAuthenticatedUserId();

        ContestModelPhotoListResponse res =
                contestModelPhotoService.delete(contestId, modelPhotoId, userId);

        return switch (res.getStatus()) {
            case SUCCESS ->
                    ResponseEntity.ok(res);

            case CONTEST_NOT_FOUND, MODEL_PHOTO_NOT_FOUND ->
                    ResponseEntity.status(HttpStatus.NOT_FOUND).body(res);

            case FORBIDDEN ->
                    ResponseEntity.status(HttpStatus.FORBIDDEN).body(res);

            default ->
                    ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(res);
        };
    }

    /**
     * データベース例外など、Service層からスローされたRuntimeExceptionを捕捉する
     */
    @ExceptionHandler({RuntimeException.class, DatabaseOperationException.class})
    public ResponseEntity<ContestModelPhotoListResponse> handleInternalErrors(Exception ex) {
        log.error("Unhandled Internal Error during contest model photo operation.", ex);

        ContestModelPhotoListResponse errorResult = ContestModelPhotoListResponse.builder()
                .status(ContestModelPhotoCreateStatus.INTERNAL_SERVER_ERROR)
                .photos(java.util.List.of())
                .build();

        return new ResponseEntity<>(errorResult, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}