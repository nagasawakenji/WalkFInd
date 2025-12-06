package nagasawakenji.walkfind.domain.dto;


import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Value;

import java.time.OffsetDateTime;

@Value
public class CreatingContestRequest {
    private final String name;
    private final String theme;
    private final OffsetDateTime startDate;
    private final OffsetDateTime endDate;

    @JsonCreator
    public CreatingContestRequest(
            @JsonProperty("name") String name,
            @JsonProperty("theme") String theme,
            @JsonProperty("startDate") OffsetDateTime startDate,
            @JsonProperty("endDate") OffsetDateTime endDate
    ) {
        this.name = name;
        this.theme = theme;
        this.startDate = startDate;
        this.endDate = endDate;
    }
}
