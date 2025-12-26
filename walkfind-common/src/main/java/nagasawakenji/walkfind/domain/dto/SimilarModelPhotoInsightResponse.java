package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Value;
import nagasawakenji.walkfind.domain.statusenum.SimilarModelPhotoStatus;

@Value
@Builder
public class SimilarModelPhotoInsightResponse {
    SimilarModelPhotoStatus status;
    SimilaritySummary summary;     // ←統計・スコア
    String comment;               // 任意（summaryに含めてもOK）
}
