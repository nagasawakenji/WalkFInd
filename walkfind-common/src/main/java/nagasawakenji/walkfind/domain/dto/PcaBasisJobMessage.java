package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class PcaBasisJobMessage {

    @Builder.Default
    String type = "PCA_BASIS";

    Long contestId;
    String modelVersion;

    @Builder.Default
    Integer dim = 3;

    @Builder.Default
    Integer minReady = 3;
}
