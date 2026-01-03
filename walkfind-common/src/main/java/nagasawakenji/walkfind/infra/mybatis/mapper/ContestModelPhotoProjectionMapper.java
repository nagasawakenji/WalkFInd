package nagasawakenji.walkfind.infra.mybatis.mapper;

import nagasawakenji.walkfind.domain.dto.ContestModelPhotoProjectionRow;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ContestModelPhotoProjectionMapper {

    List<ContestModelPhotoProjectionRow> findByContestIdAndModelVersion(
            @Param("contestId") Long contestId,
            @Param("modelVersion") String modelVersion
    );
}