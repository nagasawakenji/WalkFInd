package nagasawakenji.WalkFind.domain.dto;

import lombok.Builder;
import lombok.Value;
import nagasawakenji.WalkFind.domain.statusenum.CalculationStatus;

/**
 * 結果集計処理（定期実行）の結果レポート用DTO。
 */
@Value
@Builder
public class CalculationResult {
    private final Long contestId;
    private final CalculationStatus status;
    private final String message;
    private final Integer photosProcessed;
}