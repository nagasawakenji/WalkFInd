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
public class PhotoDeleteService {

    private final PhotoMapper photoMapper;
    private final PhotoEmbeddingMapper photoEmbeddingMapper;
    private final S3DeleteService s3DeleteService;

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

        // ベストエフォートで embedding を削除（失敗しても写真削除は継続する）
        try {
            Long contestId = photo.getContestId();
            int embDeleted = photoEmbeddingMapper.deleteUserEmbeddingById(contestId, photoId);
            log.info("Deleted user embedding. contestId={}, photoId={}, deletedRows={}", contestId, photoId, embDeleted);
        } catch (Exception e) {
            log.warn("Failed to delete user embedding (best-effort). photoId={}", photoId, e);
        }

        String photoKey = photo.getPhotoUrl();

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

            // 4. DB削除が成功した場合のみS3から削除する
            if (StringUtils.hasText(photoKey)) {
                try {
                    s3DeleteService.delete(photoKey);
                } catch (Exception e) {
                    // ストレージ削除失敗はログにとどめ、DB側の削除は優先
                    log.error("Failed to delete S3 object. key={}, photoId={}", photoKey, photoId, e);
                }
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
