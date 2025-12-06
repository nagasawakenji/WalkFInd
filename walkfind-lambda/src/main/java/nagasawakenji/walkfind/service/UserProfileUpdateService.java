package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.UpdatingUserBioRequest;
import nagasawakenji.walkfind.domain.dto.UpdatingUserProfileImageRequest;
import nagasawakenji.walkfind.domain.dto.UpdatingUserProfileResponse;
import nagasawakenji.walkfind.domain.model.UserProfile;
import nagasawakenji.walkfind.domain.statusenum.UpdateUserProfileStatus;
import nagasawakenji.walkfind.exception.DatabaseOperationException;
import nagasawakenji.walkfind.infra.mybatis.mapper.UserProfileMapper;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * 本番用のユーザープロフィール更新サービス.
 *
 * - bio 更新
 * - プロフィール画像キー（S3オブジェクトキー）の更新
 *
 * 画像アップロード自体は S3 Presigned URL を用いた別フローで行い、
 * このサービスでは「どの S3 キーをプロフィールとして採用するか」を管理します。
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class UserProfileUpdateService {

    private final UserProfileMapper userProfileMapper;
    private final S3DeleteService s3DeleteService;

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
     * プロフィール画像のみ更新（S3 を前提とした本番用）
     *
     * 想定フロー:
     *  1. フロントが別エンドポイントで「アップロード用 Presigned URL + key」を取得
     *  2. フロントがその URL に対して画像を PUT する
     *  3. アップロード完了後、このメソッドを呼び出し、profileImageKey を渡す
     *
     * ※ DTO 側のフィールド名は profileImageKey を想定しています。
     *    すでに profileImageUrl などで作っている場合は、
     *    - DTO を getProfileImageKey() にリネームするか
     *    - ここで呼んでいるメソッド名を実際のものに合わせてください。
     */
    @Transactional
    public UpdatingUserProfileResponse updateProfileImageByKey(String userId, UpdatingUserProfileImageRequest request) {
        // ★ DTO 側のメソッド名に合わせてください（例: getProfileImageKey）
        String newImageKey = request.getProfileImageUrl();
        log.debug("[UserProfileUpdateService] updateProfileImageByKey start. userId={}, newKey={}", userId, newImageKey);

        if (newImageKey == null || newImageKey.isBlank()) {
            log.warn("[UserProfileUpdateService] profileImageKey is null or blank. userId={}", userId);
            return UpdatingUserProfileResponse.builder()
                    .userId(userId)
                    .bio(null)
                    .profileImageUrl(null)
                    .status(UpdateUserProfileStatus.FAILED)
                    .message("プロフィール画像キーが指定されていません。")
                    .build();
        }

        String oldImageKey = null;

        try {
            // ① 現在のプロフィールを取得して、古い画像キーを退避
            Optional<UserProfile> existingOpt = userProfileMapper.findByUserId(userId);
            if (existingOpt.isEmpty()) {
                log.warn("[UserProfileUpdateService] user_profiles not found before image update. userId={}", userId);

                // プロフィールレコードが無い場合、S3 にアップロードされてしまった画像があれば削除しておく
                try {
                    s3DeleteService.delete(newImageKey);
                    log.info("[UserProfileUpdateService] compensation delete NEW profile image in S3 (profile not found). key={}", newImageKey);
                } catch (Exception ex) {
                    log.warn("[UserProfileUpdateService] failed to delete NEW profile image in S3 (profile not found). key={}", newImageKey, ex);
                }

                return UpdatingUserProfileResponse.builder()
                        .userId(userId)
                        .bio(null)
                        .profileImageUrl(null)
                        .status(UpdateUserProfileStatus.NOT_FOUND)
                        .message("プロフィール情報が存在しません。")
                        .build();
            }

            UserProfile existing = existingOpt.get();
            // このカラムには「S3オブジェクトキー」を保存しておく前提
            oldImageKey = existing.getProfileImageUrl();
            log.debug("[UserProfileUpdateService] existing profile image key. userId={}, oldKey={}", userId, oldImageKey);

            // ② DB を新しいキーで更新
            int updated = userProfileMapper.updateProfileImage(userId, newImageKey);
            log.debug("[UserProfileUpdateService] updateProfileImageByKey DB result. userId={}, updatedRows={}", userId, updated);

            if (updated == 0) {
                log.warn("[UserProfileUpdateService] user_profiles not found for image update (after select). userId={}", userId);

                // 念のため補償: 新しい画像を削除
                try {
                    s3DeleteService.delete(newImageKey);
                    log.info("[UserProfileUpdateService] compensation delete NEW profile image in S3 (updated=0). key={}", newImageKey);
                } catch (Exception ex) {
                    log.warn("[UserProfileUpdateService] failed to delete NEW profile image in S3 (updated=0). key={}", newImageKey, ex);
                }

                return UpdatingUserProfileResponse.builder()
                        .userId(userId)
                        .bio(null)
                        .profileImageUrl(null)
                        .status(UpdateUserProfileStatus.NOT_FOUND)
                        .message("プロフィール情報が存在しません。")
                        .build();
            }

            log.info("[UserProfileUpdateService] profile image key updated successfully. userId={}", userId);

            // ③ 古い画像キーがあればベストエフォートで S3 から削除
            if (oldImageKey != null && !oldImageKey.isBlank()) {
                try {
                    s3DeleteService.delete(oldImageKey);
                    log.info("[UserProfileUpdateService] old profile image deleted from S3. userId={}, oldKey={}", userId, oldImageKey);
                } catch (Exception ex) {
                    // ここはリークするだけなのでロールバックせず WARN のみにする
                    log.warn("[UserProfileUpdateService] failed to delete OLD profile image in S3. key={}", oldImageKey, ex);
                }
            }

            return UpdatingUserProfileResponse.builder()
                    .userId(userId)
                    .bio(null)
                    // DB には key を保存している想定。レスポンスでも一旦同じ値を返す。
                    .profileImageUrl(newImageKey)
                    .status(UpdateUserProfileStatus.SUCCESS)
                    .message("プロフィール画像を更新しました。")
                    .build();

        } catch (DataAccessException e) {
            log.error("[UserProfileUpdateService] DB error while updating profile image by key. userId={}", userId, e);

            // ★ 補償: DB 更新に失敗した場合、新しい画像を削除しておく
            try {
                s3DeleteService.delete(newImageKey);
                log.info("[UserProfileUpdateService] compensation delete NEW profile image in S3 after DB error. key={}", newImageKey);
            } catch (Exception ex) {
                log.warn("[UserProfileUpdateService] failed to delete NEW profile image in S3 after DB error. key={}", newImageKey, ex);
            }

            throw new DatabaseOperationException("プロフィール画像の更新に失敗しました。", e);

        } catch (RuntimeException e) {
            log.error("[UserProfileUpdateService] Unexpected error while updating profile image by key. userId={}", userId, e);

            try {
                s3DeleteService.delete(newImageKey);
                log.info("[UserProfileUpdateService] compensation delete NEW profile image in S3 after unexpected error. key={}", newImageKey);
            } catch (Exception ex) {
                log.warn("[UserProfileUpdateService] failed to delete NEW profile image in S3 after unexpected error. key={}", newImageKey, ex);
            }

            throw e;
        }
    }
}