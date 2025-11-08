package nagasawakenji.WalkFind.infra.mybatis.mapper;

import nagasawakenji.WalkFind.domain.model.UserPhoto;
import nagasawakenji.WalkFind.domain.dto.PhotoResponse;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;
import java.util.Optional;

@Mapper
public interface PhotoMapper {

    // 新しい写真投稿を登録
    int insert(UserPhoto photo);

    // 指定コンテストでユーザーが既に投稿済みかを確認
    Optional<UserPhoto> findByContestAndUser(@Param("contestId") Long contestId, @Param("userId") String userId);

    // 指定コンテストの投稿写真リストと投稿者情報を取得 (DTOへのマッピングを想定)
    List<PhotoResponse> findAllPhotosByContest(Long contestId);

    // 特定の投稿の詳細情報を取得
    Optional<UserPhoto> findPhotoDetail(Long photoId);

    // 投票があった際、total_votesをインクリメント（+1）する
    int incrementTotalVotes(Long photoId);
}