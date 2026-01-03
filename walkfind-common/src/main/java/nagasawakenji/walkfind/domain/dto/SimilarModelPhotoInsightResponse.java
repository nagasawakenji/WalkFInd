package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Value;
import nagasawakenji.walkfind.domain.statusenum.SimilarModelPhotoStatus;

@Value
@Builder
public class SimilarModelPhotoInsightResponse {
    SimilarModelPhotoStatus status;
    SimilaritySummary summary;
    String comment;

    ProjectionResponse projectionResponse;
}
