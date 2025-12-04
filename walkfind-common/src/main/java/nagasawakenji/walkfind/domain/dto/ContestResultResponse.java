package nagasawakenji.walkfind.domain.dto;

import lombok.*;

import java.time.OffsetDateTime;

/**
 * コンテスト結果表示用のDTO。
 * 順位、最終スコア、写真情報、投稿者名を結合して返却します。
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContestResultResponse {
    private Long photoId;
    private Long contestId;
    private Integer finalRank;
    private Integer finalScore;
    private Boolean isWinner;
    private String title;
    private String photoUrl;
    private String username;
    private String userId;
    private OffsetDateTime submissionDate;
}