package nagasawakenji.walkfind.infra.mybatis.mapper;

import nagasawakenji.walkfind.domain.dto.ContestResultResponse;
import nagasawakenji.walkfind.domain.dto.ContestWinnerDto;
import nagasawakenji.walkfind.domain.model.ContestResult;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

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

    List<ContestResultResponse> findDetailedResultsByContestId(@Param("contestId") Long contestId, @Param("page") int page, @Param("size") int size);

    // 終了済みのコンテストの投稿件数を取得する
    long countResultsByContestId(@Param("contestId") Long contestId);

    // 終了済みのコンテストの優勝作品を取得する
    List<ContestWinnerDto> findWinnerPhotosByContestId(@Param("contestId") Long contestId);
}
