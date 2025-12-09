package nagasawakenji.walkfind.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.UpdatingUserBioRequest;
import nagasawakenji.walkfind.domain.dto.UpdatingUserProfileImageRequest;
import nagasawakenji.walkfind.domain.dto.UpdatingUserProfileResponse;
import nagasawakenji.walkfind.domain.statusenum.UpdateUserProfileStatus;
import nagasawakenji.walkfind.service.UserProfileUpdateService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * ユーザープロフィール更新用コントローラー。
 *
 * 対象は「自分自身のプロフィール(me)」のみを想定しており、
 * Cognito などの ID プロバイダから渡される userId(sub) を利用して更新します。
 *
 * エンドポイント例:
 *  - PATCH /api/v1/me/profile/bio   : 自己紹介文の更新
 *  - PATCH /api/v1/me/profile/image : プロフィール画像キーの更新
 */
@RestController
@RequestMapping("/api/v1/me/profile")
@RequiredArgsConstructor
@Slf4j
public class UserProfileController {

    private final UserProfileUpdateService userProfileUpdateService;

    /**
     * 自己紹介文(bio)の更新。
     *
     * @param userId  認証済みユーザーのID (例: JWT の sub クレーム)
     * @param request 更新する自己紹介文
     */
    @PatchMapping("/bio")
    public ResponseEntity<UpdatingUserProfileResponse> updateBio(
            @AuthenticationPrincipal(expression = "claims['sub']") String userId,
            @RequestBody @Valid UpdatingUserBioRequest request
    ) {
        log.info("[UserProfileController] updateBio called. userId={}", userId);

        UpdatingUserProfileResponse response = userProfileUpdateService.updateBio(userId, request);
        HttpStatus status = mapStatusToHttp(response.getStatus());

        return ResponseEntity.status(status).body(response);
    }

    /**
     * プロフィール画像キーの更新。
     *
     * 画像自体のアップロードは別フロー(S3 Presigned URL)で完了している前提で、
     * このエンドポイントでは「どの S3 オブジェクトキーをプロフィール画像として採用するか」
     * のみを更新します。
     *
     * @param userId  認証済みユーザーのID
     * @param request 新しいプロフィール画像キーを含むリクエスト
     */
    @PatchMapping("/image")
    public ResponseEntity<UpdatingUserProfileResponse> updateProfileImage(
            @AuthenticationPrincipal(expression = "claims['sub']") String userId,
            @RequestBody @Valid UpdatingUserProfileImageRequest request
    ) {
        log.info("[UserProfileController] updateProfileImage called. userId={}", userId);

        UpdatingUserProfileResponse response = userProfileUpdateService.updateProfileImageByKey(userId, request);
        HttpStatus status = mapStatusToHttp(response.getStatus());

        return ResponseEntity.status(status).body(response);
    }

    /**
     * ドメイン層のステータスを HTTP ステータスコードにマッピングするユーティリティ。
     */
    private HttpStatus mapStatusToHttp(UpdateUserProfileStatus status) {
        if (status == null) {
            return HttpStatus.INTERNAL_SERVER_ERROR;
        }
        return switch (status) {
            case SUCCESS -> HttpStatus.OK;
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case FAILED -> HttpStatus.BAD_REQUEST;
            case INTERNAL_SERVER_ERROR -> HttpStatus.INTERNAL_SERVER_ERROR;
        };
    }
}
