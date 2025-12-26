package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Value;
import nagasawakenji.walkfind.domain.statusenum.SimilarModelPhotoStatus;

import java.util.List;

@Value
@Builder
public class SimilarModelPhotoListResponse {
    SimilarModelPhotoStatus status;

    /** TopK（近い順） */
    List<SimilarModelPhotoItem> models;
}
