package nagasawakenji.walkfind.domain.model;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class Vote {
    private Long id;
    private Long photoId;
    private String userId; // 投票を行ったユーザーID
    private OffsetDateTime votedAt;
}
