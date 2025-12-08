package nagasawakenji.walkfind.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.PresignedUrlResponse;
import nagasawakenji.walkfind.service.S3UploadPresignService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/upload")
@RequiredArgsConstructor
@Slf4j
public class S3PresignController {

    private final S3UploadPresignService presignService;

    @GetMapping("/presigned-url")
    public ResponseEntity<PresignedUrlResponse> getPresignedUrl(
            @RequestParam("key") String key,          // 例: "contest-icons/1/スクリーンショット.png"
            @RequestParam("contentType") String contentType // 例: "image/png" (追加！)
    ) {
        // 拡張子の抽出
        String extension = "";
        int dotIndex = key.lastIndexOf('.');
        if (dotIndex >= 0) {
            extension = key.substring(dotIndex); // ".png"
        }

        // ディレクトリ部分の抽出 (最後のスラッシュまで)
        String directory = "";
        int slashIndex = key.lastIndexOf('/');
        if (slashIndex >= 0) {
            directory = key.substring(0, slashIndex + 1); // "contest-icons/1/"
        }

        // 安全なキーの生成 (ディレクトリ + UUID + 拡張子)
        // 日本語ファイル名はここで消滅し、安全なASCII文字だけにする
        String safeKey = directory + UUID.randomUUID() + extension;

        // 署名付きURLの発行 (Content-Typeを指定して署名)
        var url = presignService.generateUploadUrl(safeKey, contentType);

        PresignedUrlResponse response = PresignedUrlResponse.builder()
                .photoUrl(url)
                .key(safeKey)
                .build();

        return ResponseEntity.ok(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleException(Exception e) {
        log.error("Presign error", e);
        return ResponseEntity.internalServerError()
                .body("URL生成エラー: " + e.getMessage());
    }
}