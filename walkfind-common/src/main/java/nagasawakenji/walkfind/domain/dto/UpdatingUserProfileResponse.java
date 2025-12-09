package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Value;
import nagasawakenji.walkfind.domain.statusenum.UpdateUserProfileStatus;

@Value
@Builder
public class UpdatingUserProfileResponse {

    String userId;

    String profileImageUrl;

    String bio;

    UpdateUserProfileStatus status;

    String message;
}