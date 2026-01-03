package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class ProjectionResponse {
    Integer dim;                 // 2 or 3
    String method;               // "PCA"
    String modelVersion;         // "openclip-vitb32-v1"
    Long contestId;

    ProjectionPoint userPoint;
    List<ProjectionPoint> modelPoints; // モデル点群
}