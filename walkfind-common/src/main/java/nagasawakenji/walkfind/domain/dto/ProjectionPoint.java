package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ProjectionPoint {
    Long photoId;        // modelPhotoId or userPhotoId
    String photoType;    // "MODEL" / "USER"（フロントで分けたいなら）
    Float x;
    Float y;
    Float z;
    // あると便利：タイトル/サムネURLなど
    String imageUrl;
    String title;
}