package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import java.io.File;

@Service
@Slf4j
@RequiredArgsConstructor
public class LocalStorageDeleteService {

    @Value("${app.local-storage-dir}")
    private String storageRoot;

    /**
     * ローカルストレージからファイルを削除する
     * @param key 保存されている相対パス（例: "contest-1/icon-uuid.png"）
     */
    public void deleteFile(String key) {
        if (key == null || key.isBlank()) {
            log.warn("Delete request ignored because key is empty");
            return;
        }

        try {
            String cleanKey = StringUtils.cleanPath(key);
            File target = new File(storageRoot + File.separator + cleanKey);

            if (!target.exists()) {
                log.warn("File not found on delete: {}", target.getAbsolutePath());
                return;
            }

            if (target.delete()) {
                log.info("Local file deleted successfully: {}", cleanKey);
            } else {
                log.error("Failed to delete file (file system error): {}", target.getAbsolutePath());
            }

        } catch (Exception e) {
            log.error("Exception occurred while deleting local file: {}", key, e);
        }
    }
}
