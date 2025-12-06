package nagasawakenji.walkfind.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContestIcon {

    private Long id;               // PK（履歴・拡張性のために追加）
    private Long contestId;        // contests.id に対応（NOT NULL 推奨）
    private String iconUrl;        // S3 or ローカルの画像URL（NULL 可能）
    private LocalDateTime uploadedAt;
    private LocalDateTime updatedAt;

    /**
     * アイコンが設定されているか？
     *
     * @return iconUrl が null または空文字でない場合
     */
    public boolean hasIcon() {
        return iconUrl != null && !iconUrl.isBlank();
    }
}