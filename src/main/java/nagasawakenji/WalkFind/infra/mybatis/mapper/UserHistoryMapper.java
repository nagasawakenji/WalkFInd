package nagasawakenji.walkfind.infra.mybatis.mapper;

import nagasawakenji.walkfind.domain.dto.ContestResultDto;
import nagasawakenji.walkfind.domain.dto.PhotoDto;
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
