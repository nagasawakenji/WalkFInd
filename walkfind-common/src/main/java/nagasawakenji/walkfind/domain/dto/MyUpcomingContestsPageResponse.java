package nagasawakenji.walkfind.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class MyUpcomingContestsPageResponse {
    private List<MyContestResponse> contests;
    private long totalCount;
    private int page;
    private int size;
}