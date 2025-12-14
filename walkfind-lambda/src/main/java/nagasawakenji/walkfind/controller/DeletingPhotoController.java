package nagasawakenji.walkfind.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.DeletingPhotoResponse;
import nagasawakenji.walkfind.domain.statusenum.DeletePhotoStatus;
import nagasawakenji.walkfind.exception.DatabaseOperationException;
import nagasawakenji.walkfind.service.AuthService;
import nagasawakenji.walkfind.service.PhotoDeleteService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/photos")
@RequiredArgsConstructor
@Slf4j
public class DeletingPhotoController {

    private final PhotoDeleteService photoDeleteService;
    private final AuthService authService;


    @PreAuthorize("isAuthenticated()")
    @DeleteMapping("/{photoId}")
    public ResponseEntity<DeletingPhotoResponse> deletePhoto(
            @PathVariable("photoId") Long photoId
    ) {
        String userId = authService.getAuthenticatedUserId();

        DeletingPhotoResponse response = photoDeleteService.deletePhoto(photoId, userId);

        return switch (response.getStatus()) {
            case SUCCESS ->
                    ResponseEntity.ok(response);

            case NOT_FOUND ->
                    ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);

            case FORBIDDEN ->
                    ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);

            case FAILED ->
                    ResponseEntity.badRequest().body(response);

            case INTERNAL_SERVER_ERROR ->
                    ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);

            default ->
                    ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        };
    }

    @ExceptionHandler({RuntimeException.class, DatabaseOperationException.class})
    public ResponseEntity<DeletingPhotoResponse> handleInternalError(Exception ex) {
        log.error("Unhandled error during photo delete.", ex);

        DeletingPhotoResponse error = DeletingPhotoResponse.builder()
                .photoId(null)
                .status(DeletePhotoStatus.INTERNAL_SERVER_ERROR)
                .message("サーバー内部でエラーが発生しました。時間をおいて再度お試しください。")
                .build();

        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}