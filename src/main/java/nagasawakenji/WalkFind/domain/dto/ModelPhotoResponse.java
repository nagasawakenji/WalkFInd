package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Value;

import java.time.OffsetDateTime;

@Value
@Builder
public class ModelPhotoResponse {
    Long id;
    String title;
    String description;
    String photoUrl;
    OffsetDateTime createdAt;
}