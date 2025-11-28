package nagasawakenji.walkfind.controller;

import nagasawakenji.walkfind.domain.dto.ContestDetailResponse;
import nagasawakenji.walkfind.domain.dto.ContestResponse;
import nagasawakenji.walkfind.service.ContestService;
import nagasawakenji.walkfind.exception.ContestNotFoundException;
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
public class ContestController {

    private final ContestService contestService;

    /**
     * GET /api/v1/contests : 全てのアクティブなコンテストを一覧表示（認証不要）
     */
    @GetMapping
    public ResponseEntity<List<ContestResponse>> getAllContests() {

        List<ContestResponse> contests = contestService.getAllActiveContests();

        return ResponseEntity.ok(contests);
    }

    /**
     * GET /api/v1/contests/announced : 結果発表済みのコンテストを一覧表示 (認証不要)
     */
    @GetMapping("/announced")
    public ResponseEntity<List<ContestResponse>> getAnnouncedContests(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size
    ) {
        List<ContestResponse> contests = contestService.getAnnouncedContests(page, size);

        return ResponseEntity.ok(contests);
    }

    /**
     * GET /api/v1/contests/{contestId} : 特定のコンテストの詳細を表示（認証不要）
     */
    @GetMapping("/{contestId}")
    public ResponseEntity<ContestDetailResponse> getContestDetail(@PathVariable("contestId") Long contestId) {

        ContestDetailResponse detail = contestService.getContestDetail(contestId);

        return ResponseEntity.ok(detail);
    }

    /**
     * ContestNotFoundExceptionを捕捉し、404 Not Foundを返す
     */
    @ExceptionHandler(ContestNotFoundException.class)
    public ResponseEntity<String> handleNotFound(ContestNotFoundException ex) {
        log.warn("Contest not found: {}", ex.getMessage());
        return new ResponseEntity<>(ex.getMessage(), HttpStatus.NOT_FOUND);
    }
}