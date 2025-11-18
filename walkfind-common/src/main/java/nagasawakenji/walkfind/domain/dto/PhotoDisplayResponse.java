package nagasawakenji.walkfind.domain.dto;

import lombok.Data;

import java.net.URL;
import java.time.OffsetDateTime;

@Data
public class PhotoDisplayResponse {
    private Long photoId;
    private String title;
    private String username; // 投稿ユーザーの表示名
    private URL presignedUrl;
    private Integer totalVotes;
    private OffsetDateTime submissionDate;
}
