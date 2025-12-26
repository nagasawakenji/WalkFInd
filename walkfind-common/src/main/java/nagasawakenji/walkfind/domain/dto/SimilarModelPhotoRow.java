package nagasawakenji.walkfind.domain.dto;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class SimilarModelPhotoRow {
    private Long modelPhotoId;
    private Long contestId;
    private String key;
    private String title;
    private String description;
    private OffsetDateTime createdAt;
    private Double similarity;
}