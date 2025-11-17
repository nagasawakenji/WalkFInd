package nagasawakenji.walkfind.service;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;

@Service
public class LocalStorageUploadService {

    private final String storageRoot = "local-storage";  // プロジェクト直下に保存

    /**
     * ローカル用のファイルアップロード処理
     * @param file MultipartFile（フロントから送られる）
     * @param key 保存するキー（例: "contest-model/123/photo.jpg"）
     * @return 保存後のローカルパス
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

        return destination.getAbsolutePath();
    }
}