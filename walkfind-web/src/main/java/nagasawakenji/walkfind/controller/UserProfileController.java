package nagasawakenji.walkfind.controller;


import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.UpdatingUserBioRequest;
import nagasawakenji.walkfind.domain.dto.UpdatingUserProfileResponse;
import nagasawakenji.walkfind.domain.statusenum.UpdateUserProfileStatus;
import nagasawakenji.walkfind.exception.DatabaseOperationException;
import nagasawakenji.walkfind.service.LocalUserProfileUpdateService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/profile")
@RequiredArgsConstructor
@Slf4j
public class UserProfileController {

    private final LocalUserProfileUpdateService localUserProfileUpdateService;

    /**
     * PATCH /api/v1/profile/bio
     * 自己紹介文（bio）のみ更新
     */
    @PatchMapping("/bio")
    public ResponseEntity<UpdatingUserProfileResponse> updateBio(
            Authentication authentication,
            @Validated @RequestBody UpdatingUserBioRequest request
    ) {
        String userId = authentication.getName();
        log.debug("[LocalUserProfileController] PATCH /bio called. userId={}", userId);

        UpdatingUserProfileResponse response =
                localUserProfileUpdateService.updateBio(userId, request);

        return switch (response.getStatus()) {
            case SUCCESS ->
                    ResponseEntity.ok(response);
            case NOT_FOUND ->
                    ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            case FAILED ->
                    ResponseEntity.badRequest().body(response);
            case INTERNAL_SERVER_ERROR ->
                    ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
            default ->
                    ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        };
    }

    /**
     * PUT /api/v1/profile/profile-image
     * プロフィール画像のみ更新（ローカルストレージにアップロードする版）
     *
     * フロント側:
     *   - Content-Type: multipart/form-data
     *   - フィールド名: "file"
     */
    @PutMapping(path = "/profile-image", consumes = "multipart/form-data")
    public ResponseEntity<UpdatingUserProfileResponse> updateProfileImage(
            Authentication authentication,
            @RequestPart("file") MultipartFile file
    ) {
        String userId = authentication.getName();
        log.debug("[LocalUserProfileController] PUT /profile-image called. userId={}, filename={}",
                userId, file != null ? file.getOriginalFilename() : null);

        UpdatingUserProfileResponse response =
                localUserProfileUpdateService.updateProfileImageWithLocalUpload(userId, file);

        return switch (response.getStatus()) {
            case SUCCESS ->
                    ResponseEntity.ok(response);
            case NOT_FOUND ->
                    ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            case FAILED ->
                    ResponseEntity.badRequest().body(response);
            case INTERNAL_SERVER_ERROR ->
                    ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
            default ->
                    ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        };
    }

    /**
     * 予期しない例外 or DB 例外の共通ハンドラ
     */
    @ExceptionHandler({DatabaseOperationException.class, RuntimeException.class})
    public ResponseEntity<UpdatingUserProfileResponse> handleInternalError(Exception ex) {
        log.error("[LocalUserProfileController] Unhandled error in profile update.", ex);

        UpdatingUserProfileResponse errorResponse = UpdatingUserProfileResponse.builder()
                .userId(null)
                .bio(null)
                .profileImageUrl(null)
                .status(UpdateUserProfileStatus.INTERNAL_SERVER_ERROR)
                .message("サーバー内部でエラーが発生しました。時間をおいて再度お試しください。")
                .build();

        return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
