package nagasawakenji.walkfind.domain.dto;

import lombok.Value;
import jakarta.validation.constraints.NotNull;

/**
 * 投票リクエスト（どの写真に投票するか）をクライアントから受け取るDTO。
 */
@Value
public class VoteRequest {
    @NotNull(message = "投票対象の投稿IDは必須です")
    private final Long photoId;
}