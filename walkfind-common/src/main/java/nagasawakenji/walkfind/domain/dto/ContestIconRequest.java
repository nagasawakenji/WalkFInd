package nagasawakenji.walkfind.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContestIconRequest {
    /**
     * アップロード準備時に使用（拡張子判定用）
     */
    private String filename;

    /**
     * アップロード完了後の登録時に使用（S3オブジェクトキー）
     */
    private String key;
}