package nagasawakenji.WalkFind.infra.mybatis.mapper;

import nagasawakenji.WalkFind.domain.model.ContestResult;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;
import java.util.Optional;

@Mapper
public interface ContestResultMapper {

    // 集計済みのレコードを一括で登録する
    int insertAll(List<ContestResult> results);

    // 終了済みのコンテストから投稿写真を取得する
    List<ContestResult> findByContestId(Long contestId);


    Optional<ContestResult> findByPhotoId(Long photoId);
    int deleteByContestId(Long contestId);
}
