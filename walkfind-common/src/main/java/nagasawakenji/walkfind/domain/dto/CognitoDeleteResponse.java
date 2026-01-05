package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Data;
import nagasawakenji.walkfind.domain.statusenum.CognitoDeleteStatus;

@Data
@Builder
public class CognitoDeleteResponse {
    private String deletedId;
    private CognitoDeleteStatus status;
}
