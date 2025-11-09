package nagasawakenji.WalkFind.domain.dto;

import lombok.Builder;
import lombok.Value;
import nagasawakenji.WalkFind.domain.statusenum.SubmitPhotoStatus;

import java.time.OffsetDateTime;

@Value
@Builder
public class SubmitPhotoResult {
    Long photoId;
    SubmitPhotoStatus status;
    String message;
}
