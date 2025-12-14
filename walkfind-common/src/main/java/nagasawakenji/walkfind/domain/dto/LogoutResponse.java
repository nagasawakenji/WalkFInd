package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Value;
import nagasawakenji.walkfind.domain.statusenum.LogoutStatus;

import java.time.Instant;

@Value
@Builder
public class LogoutResponse {
    LogoutStatus status;
    String message;

    // ログインしてない場合は null
    String userId;

    Instant loggedOutAt;
}