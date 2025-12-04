package nagasawakenji.walkfind.infra.mybatis.mapper;

import nagasawakenji.walkfind.domain.model.UserProfile;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.Optional;

@Mapper
public interface UserProfileMapper {

    /**
     * 新規ユーザー登録時にUserProfileレコードを挿入します。
     * @param userProfile 挿入するUserProfileオブジェクト（userIdが設定済み）
     * @return 挿入された行数 (1が期待値)
     */
    int insert(UserProfile userProfile);

    /**
     * 指定されたIDのUserProfileを取得します。
     * @param userId ユーザーID
     * @return UserProfileが存在する場合はOptionalでラップして返却
     */
    Optional<UserProfile> findByUserId(@Param("userId") String userId);

    /**
     * 投稿数や順位などのデノーマライズされた集計統計値を更新します。
     * @param userProfile 更新する値を含むUserProfileオブジェクト
     * @return 更新された行数
     */
    int updateStatistics(UserProfile userProfile);

    /**
     * 投稿数をインクリメントします
     */
    int incrementTotalPosts(@Param("userId") String userId);

    /**
     * 投稿数をデクりめんとします
     */
    int decrementTotalPosts(@Param("userId") String userId);

    /**
     * best_rankを更新します
     */
    int updateBestRankByContestId(@Param("contestId") Long contestId);

    /**
     * total_contests_enteredを更新します
     * @param userId
     * @param contestId
     * @return
     */
    int incrementTotalContestsEnteredIfFirstTime(
            @Param("userId") String userId,
            @Param("contestId") Long contestId
    );



}