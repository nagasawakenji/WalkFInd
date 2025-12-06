package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.UpdatingUserBioRequest;
import nagasawakenji.walkfind.domain.dto.UpdatingUserProfileResponse;
import nagasawakenji.walkfind.domain.model.UserProfile;
import nagasawakenji.walkfind.domain.statusenum.UpdateUserProfileStatus;
import nagasawakenji.walkfind.exception.DatabaseOperationException;
import nagasawakenji.walkfind.infra.mybatis.mapper.UserProfileMapper;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class LocalUserProfileUpdateService {

    private final UserProfileMapper userProfileMapper;

    // ローカルストレージ連携サービス
    private final LocalStorageUploadService localStorageUploadService;
    private final LocalStorageDownloadService localStorageDownloadService;

    /**
     * bio のみ更新
     */
    @Transactional
    public UpdatingUserProfileResponse updateBio(String userId, UpdatingUserBioRequest request) {
        log.debug("[UserProfileUpdateService] updateBio start. userId={}, bio={}", userId, request.getBio());

        try {
            int updated = userProfileMapper.updateBio(userId, request.getBio());
            log.debug("[UserProfileUpdateService] updateBio result. userId={}, updatedRows={}", userId, updated);

            if (updated == 0) {
                // 想定としては発生しない(アカウント作成時に INSERT 済み)が、防御的に扱う
                log.warn("[UserProfileUpdateService] user_profiles not found for bio update. userId={}", userId);
                return UpdatingUserProfileResponse.builder()
                        .userId(userId)
                        .bio(request.getBio())
                        .profileImageUrl(null)
                        .status(UpdateUserProfileStatus.NOT_FOUND)
                        .message("プロフィール情報が存在しません。")
                        .build();
            }

            log.info("[UserProfileUpdateService] bio updated successfully. userId={}", userId);

            return UpdatingUserProfileResponse.builder()
                    .userId(userId)
                    .bio(request.getBio())
                    .profileImageUrl(null)
                    .status(UpdateUserProfileStatus.SUCCESS)
                    .message("自己紹介文を更新しました。")
                    .build();

        } catch (DataAccessException e) {
            log.error("[UserProfileUpdateService] Failed to update bio. userId={}", userId, e);
            throw new DatabaseOperationException("自己紹介文の更新に失敗しました。", e);
        }
    }

    /**
     * プロフィール画像のみ更新（ローカルストレージに画像を保存する版）
     *
     * フロー:
     *  1. 画像ファイルをローカルストレージに保存 → newStoredKey を取得
     *  2. 既存プロフィールから oldImageUrl を取得し、ローカル管理なら oldStoredKey を抽出
     *  3. newStoredKey から新しいダウンロード用 URL を生成
     *  4. user_profiles.profile_image_url を新 URL で更新
     *  5. DB 更新成功後、古い画像ファイル(oldStoredKey)をベストエフォートで削除
     *  6. DB 更新に失敗した場合、新しいファイル(newStoredKey)を補償削除
     */
    @Transactional
    public UpdatingUserProfileResponse updateProfileImageWithLocalUpload(String userId, MultipartFile imageFile) {
        log.debug("[UserProfileUpdateService] updateProfileImageWithLocalUpload start. userId={}, originalFilename={}",
                userId, imageFile != null ? imageFile.getOriginalFilename() : null);

        if (imageFile == null || imageFile.isEmpty()) {
            log.warn("[UserProfileUpdateService] imageFile is null or empty. userId={}", userId);
            return UpdatingUserProfileResponse.builder()
                    .userId(userId)
                    .bio(null)
                    .profileImageUrl(null)
                    .status(UpdateUserProfileStatus.FAILED)
                    .message("プロフィール画像ファイルが指定されていません。")
                    .build();
        }

        String newStoredKey = null;
        String oldStoredKey = null;

        try {
            // 既存プロフィールを取得
            Optional<UserProfile> existingProfile = userProfileMapper.findByUserId(userId);
            if (!existingProfile.isPresent()) {
                log.warn("[UserProfileUpdateService] user_profiles not found before upload. userId={}", userId);
                return UpdatingUserProfileResponse.builder()
                        .userId(userId)
                        .bio(null)
                        .profileImageUrl(null)
                        .status(UpdateUserProfileStatus.NOT_FOUND)
                        .message("プロフィール情報が存在しません。")
                        .build();
            }

            String oldImageUrl = existingProfile.get().getProfileImageUrl();
            log.debug("[UserProfileUpdateService] existing profile image url. userId={}, url={}", userId, oldImageUrl);

            // ② 古い URL から local-storage 管理の key を抽出
            if (oldImageUrl != null && !oldImageUrl.isBlank()) {
                String prefix = "http://localhost:8080/api/v1/local-storage/";
                if (oldImageUrl.startsWith(prefix)) {
                    oldStoredKey = oldImageUrl.substring(prefix.length());
                    log.debug("[UserProfileUpdateService] extracted oldStoredKey. userId={}, key={}", userId, oldStoredKey);
                } else {
                    log.debug("[UserProfileUpdateService] old image url is not local-storage managed. userId={}, url={}",
                            userId, oldImageUrl);
                }
            }

            // 新しい画像ファイルを保存
            // 第2引数は既存の storedKey (oldStoredKey) を渡す想定。
            // 実装側で上書き・新規生成などを判断できるようにする。
            newStoredKey = localStorageUploadService.saveFile(imageFile, oldStoredKey);
            log.info("[UserProfileUpdateService] profile image file saved. userId={}, key={}", userId, newStoredKey);

            // saveFile が null や空文字を返した場合は異常とみなして終了
            if (newStoredKey == null || newStoredKey.isBlank()) {
                log.error("[UserProfileUpdateService] saveFile returned null/blank storedKey. userId={}", userId);

                return UpdatingUserProfileResponse.builder()
                        .userId(userId)
                        .bio(null)
                        .profileImageUrl(null)
                        .status(UpdateUserProfileStatus.FAILED)
                        .message("プロフィール画像の保存に失敗しました。時間をおいて再度お試しください。")
                        .build();
            }

            // DB 更新: profile_image_url にはストレージキー（newStoredKey）を保存する
            int updated = userProfileMapper.updateProfileImage(userId, newStoredKey);
            log.debug("[UserProfileUpdateService] updateProfileImageWithLocalUpload DB result. userId={}, updatedRows={}",
                    userId, updated);

            if (updated == 0) {
                log.warn("[UserProfileUpdateService] user_profiles not found for image update(with local upload). userId={}", userId);

                // ★ 補償：新しいファイルを削除
                if (newStoredKey != null) {
                    try {
                        localStorageUploadService.deleteFile(newStoredKey);
                        log.info("[UserProfileUpdateService] compensation delete NEW profile image file (not found). key={}", newStoredKey);
                    } catch (Exception ex) {
                        log.warn("[UserProfileUpdateService] failed to delete NEW profile image file in compensation (not found). key={}", newStoredKey, ex);
                    }
                }

                return UpdatingUserProfileResponse.builder()
                        .userId(userId)
                        .bio(null)
                        .profileImageUrl(null)
                        .status(UpdateUserProfileStatus.NOT_FOUND)
                        .message("プロフィール情報が存在しません。")
                        .build();
            }

            log.info("[UserProfileUpdateService] profile image updated(with local upload) successfully. userId={}", userId);

            // レスポンス用に公開 URL を生成（DB には保存しない）
            String newImageUrl = localStorageDownloadService.generatedDownloadUrl(newStoredKey).toString();
            log.debug("[UserProfileUpdateService] generated profile image url for response. userId={}, url={}", userId, newImageUrl);

            if (updated == 0) {
                log.warn("[UserProfileUpdateService] user_profiles not found for image update(with local upload). userId={}", userId);

                // ★ 補償：新しいファイルを削除
                if (newStoredKey != null) {
                    try {
                        localStorageUploadService.deleteFile(newStoredKey);
                        log.info("[UserProfileUpdateService] compensation delete NEW profile image file (not found). key={}", newStoredKey);
                    } catch (Exception ex) {
                        log.warn("[UserProfileUpdateService] failed to delete NEW profile image file in compensation (not found). key={}", newStoredKey, ex);
                    }
                }

                return UpdatingUserProfileResponse.builder()
                        .userId(userId)
                        .bio(null)
                        .profileImageUrl(null)
                        .status(UpdateUserProfileStatus.NOT_FOUND)
                        .message("プロフィール情報が存在しません。")
                        .build();
            }

            log.info("[UserProfileUpdateService] profile image updated(with local upload) successfully. userId={}", userId);

            // ⑥ 古い画像ファイルを削除（ベストエフォート）
            if (oldStoredKey != null) {
                try {
                    localStorageUploadService.deleteFile(oldStoredKey);
                    log.info("[UserProfileUpdateService] old profile image file deleted. userId={}, key={}", userId, oldStoredKey);
                } catch (Exception ex) {
                    log.warn("[UserProfileUpdateService] failed to delete OLD profile image file. key={}", oldStoredKey, ex);
                }
            }

            return UpdatingUserProfileResponse.builder()
                    .userId(userId)
                    .bio(null)
                    .profileImageUrl(newImageUrl)
                    .status(UpdateUserProfileStatus.SUCCESS)
                    .message("プロフィール画像を更新しました。")
                    .build();

        } catch (DataAccessException e) {
            log.error("[UserProfileUpdateService] DB error while updating profile image(with local upload). userId={}", userId, e);

            if (newStoredKey != null) {
                try {
                    localStorageUploadService.deleteFile(newStoredKey);
                    log.info("[UserProfileUpdateService] compensation delete NEW profile image file after DB error. key={}", newStoredKey);
                } catch (Exception ex) {
                    log.warn("[UserProfileUpdateService] failed to delete NEW profile image file in compensation after DB error. key={}", newStoredKey, ex);
                }
            }

            throw new DatabaseOperationException("プロフィール画像の更新に失敗しました。", e);

        } catch (RuntimeException e) {
            log.error("[UserProfileUpdateService] Unexpected error while updating profile image(with local upload). userId={}", userId, e);

            if (newStoredKey != null) {
                try {
                    localStorageUploadService.deleteFile(newStoredKey);
                    log.info("[UserProfileUpdateService] compensation delete NEW profile image file after unexpected error. key={}", newStoredKey);
                } catch (Exception ex) {
                    log.warn("[UserProfileUpdateService] failed to delete NEW profile image file in compensation after unexpected error. key={}", newStoredKey, ex);
                }
            }

            throw e;
        }
    }

}
