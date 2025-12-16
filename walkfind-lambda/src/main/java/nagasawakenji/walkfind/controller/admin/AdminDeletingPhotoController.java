package nagasawakenji.walkfind.controller.admin;

import lombok.RequiredArgsConstructor;
import nagasawakenji.walkfind.domain.dto.AdminDeletingPhotoResponse;
import nagasawakenji.walkfind.domain.statusenum.AdminDeletePhotoStatus;
import nagasawakenji.walkfind.service.AdminDeletingPhotoService;
import nagasawakenji.walkfind.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/contests")
@RequiredArgsConstructor
public class AdminDeletingPhotoController {

    private final AuthService authService;
    private final AdminDeletingPhotoService adminDeletingPhotoService;

    // DELETE /api/v1/admin/{contestId}/{photoId}
    @DeleteMapping("/{contestId}/photos/{photoId}")
    public ResponseEntity<AdminDeletingPhotoResponse> delete(
            @PathVariable("contestId") Long contestId,
            @PathVariable("photoId") Long photoId
    ) {
        String requesterUserId = authService.getAuthenticatedUserId();
        AdminDeletingPhotoResponse res = adminDeletingPhotoService.deletePhoto(contestId, photoId, requesterUserId);

        return switch (res.getStatus()) {
            case SUCCESS -> ResponseEntity.ok(res);
            case NOT_FOUND -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(res);
            case ALREADY_REMOVED -> ResponseEntity.status(HttpStatus.CONFLICT).body(res);
            case CONTEST_MISMATCH -> ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(res);
            case FORBIDDEN -> ResponseEntity.status(HttpStatus.FORBIDDEN).body(res);
            default -> ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                    AdminDeletingPhotoResponse.builder()
                            .contestId(contestId)
                            .photoId(photoId)
                            .status(AdminDeletePhotoStatus.INTERNAL_SERVER_ERROR)
                            .message("サーバーで予期せぬエラーが発生しました")
                            .build()
            );
        };
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Void> handleDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }
}