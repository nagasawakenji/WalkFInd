package nagasawakenji.WalkFind.domain.dto;

import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;

/**
 * ユーザーの過去のコンテスト成績詳細を表すDTO。
 */
@Getter
@Builder
public class ContestResultDto {
    private final String contestId;
    private final String contestName;
    private final LocalDateTime heldDate;
    private final int rank; // 順位
    private final int totalParticipants; // 総参加者数
    private final String photoId; // 提出した写真ID
}