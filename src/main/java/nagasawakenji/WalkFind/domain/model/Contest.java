package nagasawakenji.WalkFind.domain.model;

import lombok.Data;
import nagasawakenji.WalkFind.domain.statusenum.ContestStatus;

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
}
