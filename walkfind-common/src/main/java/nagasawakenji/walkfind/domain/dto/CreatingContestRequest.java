package nagasawakenji.walkfind.domain.dto;


import lombok.Value;

import java.time.OffsetDateTime;

@Value
public class CreatingContestRequest {
    private final String name;
    private final String theme;
    private final OffsetDateTime startDate;
    private final OffsetDateTime endDate;
}
