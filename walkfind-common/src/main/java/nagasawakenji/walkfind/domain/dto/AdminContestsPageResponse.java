package nagasawakenji.walkfind.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class AdminContestsPageResponse {
    private List<AdminContestResponse> contests;
    private long totalCount;
    private int page;
    private int size;
}