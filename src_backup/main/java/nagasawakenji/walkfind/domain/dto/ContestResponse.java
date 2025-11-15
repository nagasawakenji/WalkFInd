package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Value;
import nagasawakenji.walkfind.domain.statusenum.ContestStatus;
import java.time.OffsetDateTime;

/**
 * コンテスト一覧表示用のDTO。
 */
@Value
@Builder
public class ContestResponse {
    private final Long contestId;
    private final String name;
    private final String theme;
    private final ContestStatus status;
    private final OffsetDateTime startDate;
    private final OffsetDateTime endDate;
}