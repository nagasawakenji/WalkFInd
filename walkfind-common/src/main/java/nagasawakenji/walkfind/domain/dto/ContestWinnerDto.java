package nagasawakenji.walkfind.domain.dto;

import lombok.*;

import java.time.OffsetDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContestWinnerDto {
    private Long photoId;
    private Long contestId;
    private Integer finalScore;    // 確定投票数
    private String title;          // 作品名
    private String photoUrl;       // 写真URL
    private String username;       // 投稿者名
    private String userId;         // 投稿者id
    private OffsetDateTime submissionDate; // 投稿日時
}
