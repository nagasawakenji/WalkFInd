package nagasawakenji.walkfind.domain.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Value;

@Value
public class LocalStorageDownloadRequest {

    @NotBlank(message = "photoKey は必須です")
    String photoKey;   // 例: 923671f6-xxxx.png
}