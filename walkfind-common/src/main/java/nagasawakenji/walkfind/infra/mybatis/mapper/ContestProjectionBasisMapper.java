package nagasawakenji.walkfind.infra.mybatis.mapper;

import nagasawakenji.walkfind.domain.dto.ContestProjectionBasisRow;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ContestProjectionBasisMapper {

    ContestProjectionBasisRow findByContestIdAndModelVersionAndMethodAndDim(
            @Param("contestId") Long contestId,
            @Param("modelVersion") String modelVersion,
            @Param("method") String method,
            @Param("dim") Integer dim
    );

    /**
     * user embedding が無いときの fallback:
     * contestId + method + dim の中で最新の modelVersion を返す
     */
    String findLatestModelVersion(
            @Param("contestId") Long contestId,
            @Param("method") String method,
            @Param("dim") Integer dim
    );
}