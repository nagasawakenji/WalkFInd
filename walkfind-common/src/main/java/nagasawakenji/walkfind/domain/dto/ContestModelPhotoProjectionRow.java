package nagasawakenji.walkfind.domain.dto;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class ContestModelPhotoProjectionRow {
    private Long contestId;
    private String modelVersion;
    private Long modelPhotoId;

    private Float x;
    private Float y;
    private Float z; // dim=2ならnull

    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}