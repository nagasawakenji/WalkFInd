package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Value;
import nagasawakenji.walkfind.domain.statusenum.ModelPhotoStatus;

@Value
@Builder
public class ModelPhotoCreateResponse {
    Long modelPhotoId;
    ModelPhotoStatus status;
    String title;
    String message;
}