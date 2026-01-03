package nagasawakenji.walkfind.domain.dto;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class PhotoEmbeddingRow {
    private Long id;
    private String photoType;      // "USER" / "MODEL"
    private Long contestId;
    private Long photoId;
    private String key;
    private String modelVersion;
    private String status;
    private float[] embedding;

    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}