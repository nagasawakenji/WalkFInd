package nagasawakenji.walkfind.controller;

import nagasawakenji.walkfind.domain.dto.PhotoDisplayResponse;
import nagasawakenji.walkfind.domain.dto.PhotoListResponse;
import nagasawakenji.walkfind.domain.dto.PhotoResponse;
import nagasawakenji.walkfind.service.AuthService;
import nagasawakenji.walkfind.service.PhotoDisplayService;
import nagasawakenji.walkfind.exception.ContestNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.service.S3DownloadPresignService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URL;
import java.util.List;

@RestController
@RequestMapping("/api/v1/contests")
@RequiredArgsConstructor
@Slf4j
public class PhotoListController {

    private final PhotoDisplayService photoDisplayService;
    private final S3DownloadPresignService s3DownloadPresignService;
    private final AuthService authService;

    /**
     * GET /api/v1/contests/{contestId}/photos : 特定コンテストの投稿写真リストを取得
     * このエンドポイントは公開（認証不要）です。
     *
     * @param contestId コンテストID
     * @return 写真リスト（投票数順）
     */
    @GetMapping("/{contestId}/photos")
    public ResponseEntity<PhotoListResponse> getPhotos(@PathVariable("contestId") Long contestId,
                                                       @RequestParam(value = "page", defaultValue = "0") int page,
                                                       @RequestParam(value = "size", defaultValue = "20") int size) {

        String userId = authService.getAuthenticatedUserId();
        PhotoListResponse response = photoDisplayService.getPhotosByContest(contestId, page, size, userId);
        handlePhotoUrl(response);
        return ResponseEntity.ok(response);
    }


    /**
     * コンテストが見つからない例外を捕捉し、404 Not Foundを返す
     */
    @ExceptionHandler(ContestNotFoundException.class)
    public ResponseEntity<String> handleNotFound(ContestNotFoundException ex) {
        log.warn("Contest not found: {}", ex.getMessage());
        return new ResponseEntity<>(ex.getMessage(), HttpStatus.NOT_FOUND);
    }

    private void handlePhotoUrl(PhotoListResponse response) {
        response.getPhotoResponses().forEach(photo -> {
            if (photo.getPhotoUrl() != null && !photo.getPhotoUrl().isBlank()) {
                URL url = s3DownloadPresignService.generatedDownloadUrl(photo.getPhotoUrl());
                photo.setPhotoUrl(url.toString());
            }
        });
    }
}