package nagasawakenji.walkfind.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.LocalStorageDownloadRequest;
import nagasawakenji.walkfind.domain.dto.LocalStorageDownloadResponse;
import nagasawakenji.walkfind.service.LocalStorageDownloadService;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/api/v1/local-storage")
@RequiredArgsConstructor
@Slf4j
public class LocalStorageDownloadController {

    private final LocalStorageDownloadService localStorageDownloadService;

    private static final String LOCAL_STORAGE_DIR =
            "/Users/ishidzuka/Downloads/walkfind/walkfind-web/local-storage";
    /**
     * ローカル限定 GET /api/v1/local-storage/{photoKey}
     * ブラウザはここに直接アクセスする
     */
    @GetMapping("/{photoKey}")
    public ResponseEntity<Resource> downloadLocalFile(@PathVariable("photoKey") String photoKey) {

        Path filePath = Paths.get(LOCAL_STORAGE_DIR, photoKey);
        Resource resource = new FileSystemResource(filePath.toFile());

        if (!resource.exists()) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG)   // PNG の場合は IMAGE_PNG
                .header(HttpHeaders.CACHE_CONTROL, "no-cache")
                .body(resource);
    }
}