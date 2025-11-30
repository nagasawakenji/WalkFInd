package nagasawakenji.walkfind.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Paths;

@Service
@Slf4j
public class LocalStorageUploadService {

    @Value("${app.local-storage-dir}")
    private String storageRoot;

    /**
     * ローカル用のファイルアップロード処理
     * @param file MultipartFile（フロントから送られる）
     * @param key 保存するキー（例: "contest-1/uuid.jpg"）
     * @return 保存後のローカルパス（キー）
     */
    public String saveFile(MultipartFile file, String key) {

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded file is empty.");
        }

        // パスの整形
        String cleanKey = StringUtils.cleanPath(key);
        File destination = new File(storageRoot + File.separator + cleanKey);

        // ディレクトリを作成
        File parentDir = destination.getParentFile();
        if (!parentDir.exists() && !parentDir.mkdirs()) {
            throw new RuntimeException("Failed to create directory: " + parentDir.getAbsolutePath());
        }

        // 保存
        try {
            file.transferTo(destination);
        } catch (IOException ex) {
            throw new RuntimeException("Failed to save file: " + destination.getAbsolutePath(), ex);
        }

        return cleanKey;
    }

    /**
     * ファイル削除処理
     * DB保存失敗時のロールバック（補償トランザクション）として使用します。
     * @param key saveFileが返したキー（相対パス）
     */
    public void deleteFile(String key) {
        if (!StringUtils.hasText(key)) {
            return;
        }

        try {
            String cleanKey = StringUtils.cleanPath(key);
            File target = new File(storageRoot + File.separator + cleanKey);

            if (target.exists()) {
                if (target.delete()) {
                    log.info("File deleted successfully: {}", cleanKey);
                } else {
                    log.warn("Failed to delete file (file system error): {}", target.getAbsolutePath());
                }
            } else {
                log.warn("File not found for deletion: {}", target.getAbsolutePath());
            }
        } catch (Exception e) {
            // ロールバック処理中のエラーは、元のDBエラーを隠さないためにログ出力にとどめる
            log.error("Exception occurred while deleting file: " + key, e);
        }
    }
}