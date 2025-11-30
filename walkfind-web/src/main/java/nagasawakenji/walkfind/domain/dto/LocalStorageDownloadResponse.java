package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Value;

import java.net.URL;

@Value
@Builder
public class LocalStorageDownloadResponse {
    URL downloadUrl;
}