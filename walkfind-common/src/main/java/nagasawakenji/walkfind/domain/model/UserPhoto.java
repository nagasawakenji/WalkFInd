package nagasawakenji.walkfind.domain.model;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class UserPhoto {
    private Long id;
    private Long contestId;
    private String userId; // 投稿ユーザーID
    private String photoUrl; // Cloudflare R2/S3のURL
    private String title;
    private String description;
    private OffsetDateTime submissionDate;
    private Integer totalVotes; // DDL: total_votes INTEGER NOT NULL DEFAULT 0
    private Boolean isApproved;
}
