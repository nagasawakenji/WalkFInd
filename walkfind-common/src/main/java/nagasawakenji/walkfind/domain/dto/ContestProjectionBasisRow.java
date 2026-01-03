package nagasawakenji.walkfind.domain.dto;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class ContestProjectionBasisRow {
    private Long id;
    private Long contestId;
    private String modelVersion;
    private String method;
    private Integer dim;

    // postgres float4[] -> float[]
    private float[] mean;        // length=512
    private float[] components;  // length=512*dim (row-major想定)

    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}