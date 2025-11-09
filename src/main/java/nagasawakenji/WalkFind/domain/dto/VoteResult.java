package nagasawakenji.WalkFind.domain.dto;

import lombok.Builder;
import lombok.Value;
import nagasawakenji.WalkFind.domain.statusenum.VoteStatus;

/**
 * 投票処理の結果をクライアントに返すDTO。
 */
@Value
@Builder
public class VoteResult {
    private final Long photoId;
    private final VoteStatus status;
    private final String message;

    // 成功した場合、現在の総投票数を返すことも可能だが、ここではシンプルにIDとステータスに留める
}