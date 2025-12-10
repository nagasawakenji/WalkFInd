package nagasawakenji.walkfind.domain.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class ContestResultListResponse {
    @JsonProperty("items")
    List<ContestResultResponse> contestResultResponses;
    long totalCount;
}
