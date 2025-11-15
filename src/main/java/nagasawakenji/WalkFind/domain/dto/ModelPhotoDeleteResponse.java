package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Value;
import nagasawakenji.walkfind.domain.statusenum.ModelPhotoStatus;

@Value
@Builder
public class ModelPhotoDeleteResponse {
    ModelPhotoStatus status;
    Long deletedPhotoId;
    String message;
}