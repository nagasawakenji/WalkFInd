package nagasawakenji.WalkFind.controller;

import nagasawakenji.WalkFind.domain.dto.PhotoResponse;
import nagasawakenji.WalkFind.service.PhotoDisplayService;
import nagasawakenji.WalkFind.exception.ContestNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/contests")
@RequiredArgsConstructor
@Slf4j
public class PhotoListController {

    private final PhotoDisplayService photoDisplayService;

    /**
     * GET /api/v1/contests/{contestId}/photos : 特定コンテストの投稿写真リストを取得
     * このエンドポイントは公開（認証不要）です。
     *
     * @param contestId コンテストID
     * @return 写真リスト（投票数順）
     */
    @GetMapping("/{contestId}/photos")
    public ResponseEntity<List<PhotoResponse>> getPhotos(@PathVariable Long contestId) {

        List<PhotoResponse> photos = photoDisplayService.getPhotosByContest(contestId);

        // 写真が0枚でも、コンテストが存在していれば 200 OK と空のリストを返す
        return ResponseEntity.ok(photos);
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
}