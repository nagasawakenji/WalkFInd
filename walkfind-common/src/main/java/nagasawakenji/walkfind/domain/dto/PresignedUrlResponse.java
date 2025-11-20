package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Value;

import java.net.URL;

@Value
@Builder
public class PresignedUrlResponse {
    private final String key;
    private final URL photoUrl;
}
