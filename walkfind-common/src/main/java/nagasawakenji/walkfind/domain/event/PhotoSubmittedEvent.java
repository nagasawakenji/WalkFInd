package nagasawakenji.walkfind.domain.event;

import lombok.Value;

@Value
public class PhotoSubmittedEvent {
    String photoType;
    Long contestId;
    Long photoId;
    String key;
}
