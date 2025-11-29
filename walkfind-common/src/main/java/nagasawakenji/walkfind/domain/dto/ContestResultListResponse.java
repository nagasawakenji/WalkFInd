package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class ContestResultListResponse {
    List<ContestResultResponse> contestResultResponses;
    long totalCount;
}
