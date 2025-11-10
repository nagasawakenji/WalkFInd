package nagasawakenji.WalkFind.domain.dto;

import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;

/**
 * ユーザーの投稿写真の詳細を表すDTO。
 */
@Getter
@Builder
public class PhotoDto {
    private final String photoId;
    private final String photoUrl;
    private final String description;
    private final LocalDateTime postDate;
    private final int likesCount;
    private final boolean isPrivate; // 公開/非公開フラグ (公開APIなので常にfalseのものを返す想定ですが、データ構造として保持)
}