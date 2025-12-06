package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Value;
import nagasawakenji.walkfind.domain.statusenum.DeletePhotoStatus;

@Value
@Builder
public class DeletingPhotoResponse {
    Long photoId;
    DeletePhotoStatus status;
    String message;
}
