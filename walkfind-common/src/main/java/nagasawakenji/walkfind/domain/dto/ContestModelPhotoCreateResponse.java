package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Value;

import java.time.OffsetDateTime;

@Value
@Builder
public class ContestModelPhotoCreateResponse {
    Long id;
    Long contestId;
    String key;
    String title;
    String description;
    OffsetDateTime createdAt;
}