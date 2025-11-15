package nagasawakenji.walkfind.infra.mybatis.mapper;

import nagasawakenji.walkfind.domain.model.ContestModelPhoto;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ContestModelPhotoMapper {

    int insert(ContestModelPhoto photo);

    List<ContestModelPhoto> findByContestId(@Param("contestId") Long contestId);

    int deleteById(@Param("id") Long id);

    int deleteByContestId(@Param("contestId") Long contestId);

    ContestModelPhoto findById(@Param("id") Long id);
}