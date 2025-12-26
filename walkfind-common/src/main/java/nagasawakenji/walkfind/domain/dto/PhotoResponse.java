package nagasawakenji.walkfind.domain.dto;

import lombok.Data;
import nagasawakenji.walkfind.domain.statusenum.SimilarityStatus;

import java.time.OffsetDateTime;

@Data
public class PhotoResponse {
    private Long photoId;
    private String title;
    private String username; // 投稿ユーザーの表示名
    private String userId;
    private String photoUrl;
    private Integer totalVotes;
    private OffsetDateTime submissionDate;
    private SimilarityStatus status;
}
