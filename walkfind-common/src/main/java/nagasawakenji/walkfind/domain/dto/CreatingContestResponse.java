package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Value;
import nagasawakenji.walkfind.domain.statusenum.CreationContestStatus;

/**
 * コンテスト作成結果返却用のDTO
 */
@Value
@Builder
public class CreatingContestResponse {
    private final Long contestId;
    private final CreationContestStatus status;
    private final String name;
    private final String theme;
    private final String message;

}
