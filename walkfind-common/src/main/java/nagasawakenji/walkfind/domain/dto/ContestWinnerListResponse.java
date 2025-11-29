package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class ContestWinnerListResponse {
    List<ContestWinnerDto> winners;
    int totalWinnerCount;
}
