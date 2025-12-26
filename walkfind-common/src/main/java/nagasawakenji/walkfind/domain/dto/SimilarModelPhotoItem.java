package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Value;

import java.time.OffsetDateTime;

@Value
@Builder
public class SimilarModelPhotoItem {

    Long modelPhotoId;
    Long contestId;

    /** contest_model_photos.photo_url に入っている「S3 key」 */
    String key;

    String title;
    String description;

    OffsetDateTime createdAt;

    /** 0〜1目安（1に近いほど似ている） */
    Double similarity;
}
