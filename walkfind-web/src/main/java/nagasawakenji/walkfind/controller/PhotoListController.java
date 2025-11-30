package nagasawakenji.walkfind.controller;

import nagasawakenji.walkfind.domain.dto.PhotoResponse;
import nagasawakenji.walkfind.domain.dto.PhotoDisplayResponse;
import nagasawakenji.walkfind.service.LocalStorageDownloadService;
import nagasawakenji.walkfind.service.PhotoDisplayService;
import nagasawakenji.walkfind.exception.ContestNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.net.URL;

@RestController
@RequestMapping("/api/v1/contests")
@RequiredArgsConstructor
@Slf4j
public class PhotoListController {

    private final PhotoDisplayService photoDisplayService;
    private final LocalStorageDownloadService localStorageDownloadService;
    /**
     * GET /api/v1/contests/{contestId}/photos : 特定コンテストの投稿写真リストを取得
     * このエンドポイントは公開（認証不要）です。
     *
     * @param contestId コンテストID
     * @return 写真リスト（投票数順）
     */
    @GetMapping("/{contestId}/photos")
    public ResponseEntity<List<PhotoDisplayResponse>> getPhotos(@PathVariable("contestId") Long contestId) {

        List<PhotoResponse> photos = photoDisplayService.getPhotosByContest(contestId);

        List<PhotoDisplayResponse> responses = photos.stream()
                .map(this::mapToPhotoDisplayResponse)
                .toList();

        return ResponseEntity.ok(responses);
    }

    /**
     * コンテストが見つからない例外を捕捉し、404 Not Foundを返す
     */
    @ExceptionHandler(ContestNotFoundException.class)
    public ResponseEntity<String> handleNotFound(ContestNotFoundException ex) {
        log.warn("Contest not found: {}", ex.getMessage());
        return new ResponseEntity<>(ex.getMessage(), HttpStatus.NOT_FOUND);
    }

    // 他の汎用的な例外ハンドリング（500エラーなど）は、他のControllerのものと共通化します。

    private PhotoDisplayResponse mapToPhotoDisplayResponse(PhotoResponse p) {
        URL url = localStorageDownloadService.generatedDownloadUrl(p.getPhotoUrl());

        PhotoDisplayResponse res = new PhotoDisplayResponse();
        res.setPhotoId(p.getPhotoId());
        res.setTitle(p.getTitle());
        res.setUsername(p.getUsername());
        res.setTotalVotes(p.getTotalVotes());
        res.setPresignedUrl(url);
        res.setSubmissionDate(p.getSubmissionDate());

        return res;
    }
}