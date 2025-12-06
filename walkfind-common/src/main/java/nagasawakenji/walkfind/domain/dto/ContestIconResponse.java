package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ContestIconResponse {

    Long contestId;
    String iconUrl;
    boolean success;
    String message;
}