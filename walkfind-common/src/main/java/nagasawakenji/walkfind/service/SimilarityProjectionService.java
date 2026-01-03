package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.*;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestModelPhotoProjectionMapper;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestProjectionBasisMapper;
import nagasawakenji.walkfind.infra.mybatis.mapper.PhotoEmbeddingMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static java.lang.Math.min;

@Service
@Slf4j
@RequiredArgsConstructor
public class SimilarityProjectionService {

    private final ContestProjectionBasisMapper contestProjectionBasisMapper;
    private final ContestModelPhotoProjectionMapper contestModelPhotoProjectionMapper;
    private final PhotoEmbeddingMapper photoEmbeddingMapper;

    /**
     * best-effort:
     * - basis or modelPoints が無いなら null（まだ準備できてない）
     * - user embedding が無いなら userPoint=null で返す（モデル点群だけ描ける）
     */
    @Transactional(readOnly = true)
    public ProjectionResponse buildProjection(Long contestId, Long userPhotoId, int dim) {
        if (contestId == null) return null;
        dim = min(dim, 3);

        // user embedding から modelVersion を推定
        String modelVersion = photoEmbeddingMapper.findLatestUserEmbeddingModelVersion(contestId, userPhotoId);

        // basis 取得
        ContestProjectionBasisRow basis =
                contestProjectionBasisMapper.findByContestIdAndModelVersionAndMethodAndDim(
                        contestId, modelVersion, "PCA", dim
                );
        if (basis == null) return null;

        // 3) model points 取得
        List<ContestModelPhotoProjectionRow> modelRows =
                contestModelPhotoProjectionMapper.findByContestIdAndModelVersion(contestId, modelVersion);
        if (modelRows == null || modelRows.isEmpty()) return null;

        List<ProjectionPoint> modelPoints = modelRows.stream()
                .map(r -> ProjectionPoint.builder()
                        .photoType("MODEL")
                        .photoId(r.getModelPhotoId())
                        .x(r.getX())
                        .y(r.getY())
                        .z(r.getZ())
                        .build())
                .toList();

        // user embedding が READY なら userPoint をその場で射影
        ProjectionPoint userPoint = null;
        PhotoEmbeddingRow userEmb = photoEmbeddingMapper.findReadyUserEmbedding(contestId, userPhotoId, modelVersion);
        if (userEmb != null && userEmb.getEmbedding() != null) {
            float[] xyz = projectOne(userEmb.getEmbedding(), basis.getMean(), basis.getComponents(), dim);
            userPoint = ProjectionPoint.builder()
                    .photoType("USER")
                    .photoId(userPhotoId)
                    .x(xyz[0])
                    .y(xyz[1])
                    .z(dim >= 3 ? xyz[2] : null)
                    .build();
        }

        return ProjectionResponse.builder()
                .contestId(contestId)
                .modelVersion(modelVersion)
                .method("PCA")
                .dim(dim)
                .userPoint(userPoint)
                .modelPoints(modelPoints)
                .build();
    }

    /**
     * Java側射影:
     * z = (x - mean) @ W
     *
     * components は python側で W.reshape(-1) して float4[] に入れてる前提で
     * row-major: idx = i*dim + j で復元。
     */
    private float[] projectOne(float[] emb, float[] mean, float[] components, int dim) {
        float[] out = new float[]{0f, 0f, 0f};
        if (emb == null || mean == null || components == null) return out;

        int D = emb.length;
        for (int j = 0; j < dim; j++) {
            double acc = 0.0;
            for (int i = 0; i < D; i++) {
                float xi = emb[i];
                float mi = (i < mean.length) ? mean[i] : 0f;
                int idx = i * dim + j; // row-major
                float wij = (idx < components.length) ? components[idx] : 0f;
                acc += (double) (xi - mi) * (double) wij;
            }
            out[j] = (float) acc;
        }
        return out;
    }
}