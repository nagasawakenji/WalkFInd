package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class SimilaritySummary {
    Integer evaluatedK;           // 返さなくてもOK（漏洩が気になるなら削る）
    Double maxSimilarity;
    Double avgTop3;
    Integer aboveThresholdCount;  // これも “3段階” などに丸めるのが安全
    Integer matchScore;           // 0-100
}
