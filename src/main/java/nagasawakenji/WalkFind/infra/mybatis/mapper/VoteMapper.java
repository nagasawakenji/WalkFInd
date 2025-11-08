package nagasawakenji.WalkFind.infra.mybatis.mapper;

import nagasawakenji.WalkFind.domain.model.Vote;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.Optional;

@Mapper
public interface VoteMapper {

    // 投票レコードを登録
    void insert(Vote vote);

    // 指定投稿に対してユーザーが既に投票済みかを確認
    Optional<Vote> findByPhotoAndUser(@Param("photoId") Long photoId, @Param("userId") String userId);

    // 特定の投稿に対する現在の投票総数を取得
    Integer countVotesByPhoto(Long photoId);
}
