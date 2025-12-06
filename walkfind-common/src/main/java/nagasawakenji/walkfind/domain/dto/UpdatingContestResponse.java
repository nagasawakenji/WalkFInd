package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Value;
import nagasawakenji.walkfind.domain.statusenum.UpdateContestStatus;

@Value
@Builder
public class UpdatingContestResponse {
    Long contestId;
    UpdateContestStatus status;
    String name;
    String theme;
    String message;
}
