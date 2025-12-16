package nagasawakenji.walkfind.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
@AllArgsConstructor
public class AdminContestResponse {
    private Long contestId;
    private String name;
    private String theme;
    private OffsetDateTime startDate;
    private OffsetDateTime endDate;
    private String status;

    private String createdByUserId;
    private OffsetDateTime removedAt; // nullなら未削除
}