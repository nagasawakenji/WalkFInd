package nagasawakenji.walkfind.domain.model;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class ContestModelPhoto {

    private Long id;
    private Long contestId;
    private String photoUrl;
    private String title;
    private String description;
    private OffsetDateTime createdAt;
}