package nagasawakenji.walkfind.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ContestModelPhotoCreateRequest {

    @Size(max = 1024)
    private String key;

    @NotBlank
    @Size(max = 100)
    private String title;

    private String description;
}