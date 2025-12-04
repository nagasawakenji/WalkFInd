package nagasawakenji.walkfind.domain.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;

/**
 * ユーザーの投稿写真の詳細を表すDTO。
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PhotoDto {
    private String photoId;
    private String photoUrl;
    private String description;
    private OffsetDateTime postDate;
    private int likesCount;
    private boolean isPrivate; // 公開/非公開フラグ (公開APIなので常にfalseのものを返す想定ですが、データ構造として保持)
}