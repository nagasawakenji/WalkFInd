package nagasawakenji.walkfind.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.service.S3UploadPresignService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<String> getPresignedUrl(@RequestParam String key) {
        try {
            var url = presignService.generateUploadUrl(key);
            return ResponseEntity.ok(url.toString());
        } catch (Exception e) {
            log.error("Failed to generate presigned URL", e);
            return ResponseEntity.internalServerError().body("Failed to generate presigned URL");
        }
    }
}