package nagasawakenji.walkfind.domain.model;

import lombok.Data;
import nagasawakenji.walkfind.domain.statusenum.ContestStatus;

import java.time.OffsetDateTime;

@Data
public class Contest {
    private Long id;
    private String name;
    private String theme;
    private OffsetDateTime startDate;
    private OffsetDateTime endDate;
    private ContestStatus status;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private String createdByUserId;
    private String removedByUserId;
    private OffsetDateTime removedAt;
    private String removedReason;
}
