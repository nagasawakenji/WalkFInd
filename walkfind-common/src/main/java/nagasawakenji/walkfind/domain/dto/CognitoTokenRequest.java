package nagasawakenji.walkfind.domain.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CognitoTokenRequest {
    @NotBlank
    private String code;
}
