package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ContestStatusUpdateResult {
    int movedToInProgress;
    int movedToClosedVoting;
    int movedToAnnounced;
}