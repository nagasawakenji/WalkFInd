package nagasawakenji.walkfind.domain.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 投票リクエスト（どの写真に投票するか）をクライアントから受け取るDTO。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class VoteRequest {

    @NotNull(message = "投票対象の投稿IDは必須です")
    private Long photoId;

}