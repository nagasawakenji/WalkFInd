package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.SimilarModelPhotoInsightResponse;
import nagasawakenji.walkfind.domain.dto.SimilarModelPhotoListResponse;
import nagasawakenji.walkfind.domain.dto.SimilaritySummary;
import nagasawakenji.walkfind.domain.statusenum.SimilarModelPhotoStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
@RequiredArgsConstructor
public class SimilarModelPhotoCreateService {

    private final SimilarModelPhotoService similarModelPhotoService;
    private final SimilarModelPhotoInsightService similarModelPhotoInsightService;
    private final SimilarityProjectionService similarityProjectionService;

    @Transactional(readOnly = true)
    public SimilarModelPhotoInsightResponse createSimilarInsight(
            Long contestId,
            Long userPhotoId,
            String requesterUserId
    ) {
        SimilarModelPhotoListResponse response;
        try {
            response = similarModelPhotoService.findSimilarModelPhotos(
                    contestId,
                    userPhotoId,
                    requesterUserId,
                    100
            );
        } catch (Exception e) {
            log.error("findSimilarModelPhotos failed. contestId={}, userPhotoId={}", contestId, userPhotoId, e);
            throw e;
        }

        var projection = similarityProjectionService.buildProjection(contestId, userPhotoId, 3);


        // SUCCESS以外はsummaryを計算せず即返す
        if (response.getStatus() != SimilarModelPhotoStatus.SUCCESS) {
            return SimilarModelPhotoInsightResponse.builder()
                    .status(response.getStatus())
                    .comment(commentFor(response.getStatus()))
                    .projectionResponse(projection)
                    .build();
        }

        // SUCCESS のときだけ summary を計算
        SimilaritySummary summary = similarModelPhotoInsightService.calcSummary(response.getModels());

        return SimilarModelPhotoInsightResponse.builder()
                .status(SimilarModelPhotoStatus.SUCCESS)
                .summary(summary)
                .comment(commentFor(SimilarModelPhotoStatus.SUCCESS))
                .projectionResponse(projection)
                .build();
    }

    private String commentFor(SimilarModelPhotoStatus status) {
        return switch (status) {
            case SUCCESS -> "類似度が算出されました";
            case EMBEDDING_NOT_READY -> "まだ埋め込み生成中です（少し待って再読み込みしてください）";
            case NO_MODEL_EMBEDDINGS -> "このコンテストのモデル写真（埋め込み）がまだ準備できていません";
            case INVALID_REQUEST -> "リクエストが不正です";
            case CONTEST_NOT_FOUND -> "コンテストが見つかりません";
            case USER_PHOTO_NOT_FOUND -> "写真が見つかりません";
            case FORBIDDEN -> "権限がありません";
            default -> "処理できませんでした";
        };
    }
}