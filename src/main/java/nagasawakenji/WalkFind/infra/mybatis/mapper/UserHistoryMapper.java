package nagasawakenji.WalkFind.infra.mybatis.mapper;

import nagasawakenji.WalkFind.domain.dto.ContestResultDto;
import nagasawakenji.WalkFind.domain.dto.PhotoDto;
import nagasawakenji.WalkFind.domain.dto.UserHistoryResponse;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface UserHistoryMapper {

    /**
     * limitを上限として直近の特定ユーザーの投稿写真を取得する
     * @param userId
     * @param limit
     * @return PhotoDto
     */
    List<PhotoDto> getUserRecentPosts(String userId, int limit);

    /**
     * ユーザーの参加コンテストとその成績を直近順で取得する
     * @param userId
     * @return ContestResultDto
     */
    List<ContestResultDto> getUserContestResults(String userId);


}
