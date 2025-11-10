package nagasawakenji.WalkFind.domain.dto;

import lombok.Builder;
import lombok.Value;
import java.time.OffsetDateTime;

/**
 * コンテスト結果表示用のDTO。
 * 順位、最終スコア、写真情報、投稿者名を結合して返却します。
 */
@Value
@Builder
public class ContestResultResponse {
    private final Long photoId;
    private final Long contestId;
    private final Integer finalRank;     // 最終順位
    private final Integer finalScore;    // 確定投票数
    private final Boolean isWinner;      // 1位フラグ
    private final String title;          // 作品名
    private final String photoUrl;       // 写真URL
    private final String username;       // 投稿者名
    private final OffsetDateTime submissionDate; // 投稿日時
}