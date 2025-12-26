package nagasawakenji.walkfind.controller;

import lombok.RequiredArgsConstructor;
import nagasawakenji.walkfind.domain.dto.SimilarModelPhotoInsightResponse;
import nagasawakenji.walkfind.domain.statusenum.SimilarModelPhotoStatus;
import nagasawakenji.walkfind.service.AuthService;
import nagasawakenji.walkfind.service.SimilarModelPhotoCreateService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1")
public class SimilarModelPhotoInsightController {

    private final SimilarModelPhotoCreateService similarModelPhotoCreateService;
    private final AuthService authService;

    /**
     * ユーザー投稿写真に対する類似度インサイト（summary+comment）を返す
     * - フロントはポーリングで呼ぶ想定
     */
    @GetMapping("/contests/{contestId}/photos/{userPhotoId}/similarity-insight")
    public ResponseEntity<SimilarModelPhotoInsightResponse> getSimilarityInsight(
            @PathVariable("contestId") Long contestId,
            @PathVariable("userPhotoId") Long userPhotoId
    ) {
        // Cognito sub が Authentication#getName() に入る想定
        String requesterUserId = authService.getAuthenticatedUserId();

        SimilarModelPhotoInsightResponse res =
                similarModelPhotoCreateService.createSimilarInsight(contestId, userPhotoId, requesterUserId);

        return ResponseEntity.status(toHttpStatus(res.getStatus())).body(res);
    }

    private HttpStatus toHttpStatus(SimilarModelPhotoStatus status) {
        if (status == null) return HttpStatus.OK;

        return switch (status) {
            case SUCCESS, EMBEDDING_NOT_READY, NO_MODEL_EMBEDDINGS -> HttpStatus.OK; // ポーリング継続系
            case INVALID_REQUEST -> HttpStatus.BAD_REQUEST;
            case FORBIDDEN -> HttpStatus.FORBIDDEN;
            case CONTEST_NOT_FOUND, USER_PHOTO_NOT_FOUND -> HttpStatus.NOT_FOUND;
            default -> HttpStatus.OK;
        };
    }
}