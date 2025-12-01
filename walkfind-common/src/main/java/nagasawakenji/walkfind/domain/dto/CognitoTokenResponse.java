package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CognitoTokenResponse {

    private String idToken;
    private String accessToken;
    private String refreshToken;
    private Integer expiresIn;
}
