package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URL;
import java.nio.file.Paths;

@Service
@Slf4j
@RequiredArgsConstructor
public class LocalStorageDownloadService {

    private final String storageRoot = Paths.get("walkfind-web", "local-storage").toAbsolutePath().toString();

    public URL generatedDownloadUrl(String key) {
        try {
            // ローカル配信コントローラーのHTTPエンドポイントを組み立てる
            // 本番のS3 presigned URLと同じ役割
            String httpUrl = "http://localhost:8080/api/v1/local-storage/" + key;

            URL url = new URL(httpUrl);
            log.debug("Generated local HTTP download URL: {}", url);
            return url;

        } catch (Exception e) {
            log.error("Failed to generate local HTTP download URL for key: {}", key, e);
            throw new RuntimeException("ローカルHTTP画像URLの生成に失敗しました: " + key, e);
        }
    }


}
