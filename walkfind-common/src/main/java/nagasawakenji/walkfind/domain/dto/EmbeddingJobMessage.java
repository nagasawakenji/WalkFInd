package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class EmbeddingJobMessage {
    String photoType;
    Long contestId;
    Long photoId;
    String key;
    String modelVersion;
}
