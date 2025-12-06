package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Value;
import nagasawakenji.walkfind.domain.statusenum.DeleteContestStatus;

@Value
@Builder
public class DeletingContestResponse {
    Long contestId;
    DeleteContestStatus status;
    String message;
}