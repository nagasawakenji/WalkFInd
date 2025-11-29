package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Value;

import java.time.OffsetDateTime;

@Value
@Builder
public class ContestWinnerDto {
    private final Long photoId;
    private final Long contestId;
    private final Integer finalScore;    // 確定投票数
    private final String title;          // 作品名
    private final String photoUrl;       // 写真URL
    private final String username;       // 投稿者名
    private final OffsetDateTime submissionDate; // 投稿日時
}
