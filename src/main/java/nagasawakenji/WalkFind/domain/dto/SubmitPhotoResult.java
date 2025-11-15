package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Value;
import nagasawakenji.walkfind.domain.statusenum.SubmitPhotoStatus;

import java.time.OffsetDateTime;

@Value
@Builder
public class SubmitPhotoResult {
    private final Long photoId;
    private final SubmitPhotoStatus status;
    private final String message;
}
