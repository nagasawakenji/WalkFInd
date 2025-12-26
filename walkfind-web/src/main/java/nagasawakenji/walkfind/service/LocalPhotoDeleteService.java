package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.DeletingPhotoResponse;
import nagasawakenji.walkfind.domain.model.UserPhoto;
import nagasawakenji.walkfind.domain.statusenum.DeletePhotoStatus;
import nagasawakenji.walkfind.exception.DatabaseOperationException;
import nagasawakenji.walkfind.infra.mybatis.mapper.PhotoEmbeddingMapper;
import nagasawakenji.walkfind.infra.mybatis.mapper.PhotoMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class LocalPhotoDeleteService {

    private final PhotoMapper photoMapper;
    private final PhotoEmbeddingMapper photoEmbeddingMapper;
    private final LocalStorageUploadService localStorageUploadService;

    /**
     * ローカル環境用の写真削除。
     * - ユーザー本人の写真かをチェック
     * - DB削除が成功した場合のみローカルストレージから削除
     */
    @Transactional
    public DeletingPhotoResponse deletePhoto(Long photoId, String requestUserId) {

        // 対象写真を取得
        Optional<UserPhoto> photoOpt = photoMapper.findById(photoId);
        if (photoOpt.isEmpty()) {
            log.warn("Photo not found. photoId={}", photoId);
            return DeletingPhotoResponse.builder()
                    .photoId(photoId)
                    .status(DeletePhotoStatus.NOT_FOUND)
                    .message("削除対象の写真が見つかりませんでした。")
                    .build();
        }

        UserPhoto photo = photoOpt.get();

        // 権限チェック（他人の投稿は削除させない）
        if (!photo.getUserId().equals(requestUserId)) {
            log.warn("Forbidden delete attempt. photoId={}, owner={}, requester={}",
                    photoId, photo.getUserId(), requestUserId);

            return DeletingPhotoResponse.builder()
                    .photoId(photoId)
                    .status(DeletePhotoStatus.FORBIDDEN)
                    .message("この写真を削除する権限がありません。")
                    .build();
        }

        // Embedding(ユーザー写真)も削除（ベストエフォート）
        // ※ embedding は photo_embeddings にあり、photo の物理削除に追随させる
        try {
            if (photo.getContestId() != null) {
                int embDeleted = photoEmbeddingMapper.deleteUserEmbeddingById(photo.getContestId(), photoId);
                log.info("Deleted user embedding rows. contestId={}, photoId={}, deleted={}", photo.getContestId(), photoId, embDeleted);
            } else {
                log.warn("contestId is null; skip embedding delete. photoId={}", photoId);
            }
        } catch (Exception e) {
            // embedding 削除失敗はログに留め、写真削除を優先
            log.error("Failed to delete user embedding. photoId={}", photoId, e);
        }

        String photoKey = photo.getPhotoUrl(); // ローカルストレージ上のパス

        try {
            // まず DB から削除
            int deleted = photoMapper.deleteById(photoId);
            if (deleted == 0) {
                log.error("DB deletion affected 0 rows. photoId={}", photoId);
                return DeletingPhotoResponse.builder()
                        .photoId(photoId)
                        .status(DeletePhotoStatus.FAILED)
                        .message("写真の削除に失敗しました。")
                        .build();
            }

            // DB削除が成功した場合のみストレージから削除
            if (StringUtils.hasText(photoKey)) {
                try {
                    localStorageUploadService.deleteFile(photoKey);
                } catch (Exception e) {
                    // ストレージ削除失敗はログにとどめ、DB側の削除は優先
                    log.error("Failed to delete local file. key={}, photoId={}", photoKey, photoId, e);
                }
            }

            // ベストエフォートで embedding を削除（失敗しても写真削除は継続する）
            try {
                Long contestId = photo.getContestId();
                int embDeleted = photoEmbeddingMapper.deleteUserEmbeddingById(contestId, photoId);
                log.info("Deleted user embedding. contestId={}, photoId={}, deletedRows={}", contestId, photoId, embDeleted);
            } catch (Exception e) {
                log.warn("Failed to delete user embedding (best-effort). photoId={}", photoId, e);
            }

            return DeletingPhotoResponse.builder()
                    .photoId(photoId)
                    .status(DeletePhotoStatus.SUCCESS)
                    .message("写真を削除しました。")
                    .build();

        } catch (DatabaseOperationException e) {
            // サービス層で投げ直して @ExceptionHandler で拾う想定
            log.error("DatabaseOperationException while deleting photoId={}", photoId, e);
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error during photo delete. photoId={}", photoId, e);
            throw new RuntimeException("写真削除中に予期せぬエラーが発生しました。", e);
        }
    }
}