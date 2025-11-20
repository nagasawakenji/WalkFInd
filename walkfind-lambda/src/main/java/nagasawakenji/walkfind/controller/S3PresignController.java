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

    /**
     * 指定された key に対する presigned URL を返す
     * 例: key = "contest-model/123/photo.jpg"
     */
    @GetMapping("/presigned-url")
    public ResponseEntity<PresignedUrlResponse> getPresignedUrl(@RequestParam String key) {
        // 拡張子を維持する処理
        String extension = "";
        String baseName = key;
        int dotIndex = key.lastIndexOf('.');
        if (dotIndex >= 0) {
            extension = key.substring(dotIndex); // ".jpg"
            baseName = key.substring(0, dotIndex); // "photo"
        }

        // "photo" + "-" + "UUID" + ".jpg" の形にする
        String randomKey = baseName + "-" + UUID.randomUUID() + extension;
        var url = presignService.generateUploadUrl(randomKey);
        PresignedUrlResponse response = PresignedUrlResponse.builder()
                .photoUrl(url)
                .key(randomKey)
                .build();

        return ResponseEntity.ok(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleException() {
        return ResponseEntity.internalServerError()
                .body("URL生成中にエラーが発生しました");
    }
}