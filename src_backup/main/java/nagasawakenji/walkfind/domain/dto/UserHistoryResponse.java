package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Getter;
import java.util.List;

/**
 * GET /api/v1/users/{userId}/history のレスポンスDTO。
 * ユーザーの過去のコンテスト成績と最近の投稿リストを含みます。
 */
@Getter
@Builder
public class UserHistoryResponse {

    // 過去のコンテスト成績リスト (降順)
    private final List<ContestResultDto> contestResults;

    // 最近の公開投稿写真リスト (最大N件、降順)
    private final List<PhotoDto> recentPublicPosts;
}