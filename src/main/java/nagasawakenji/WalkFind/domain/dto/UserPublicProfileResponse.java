package nagasawakenji.WalkFind.domain.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * GET /api/v1/users/{userId} のレスポンスDTO。
 * 他のユーザーに公開されるプロフィール情報とサマリー統計を含みます。
 */
@Getter
@Builder
public class UserPublicProfileResponse {

    // 基本プロフィール情報 (公開情報のみ)
    private final String userId;
    private final String nickname;
    private final String profileImageUrl;
    private final String bio;

    // 統計サマリー
    private final int totalPosts; // 総投稿写真数
    private final int totalContestsEntered; // 総参加コンテスト数
    private final int bestRank; // 過去最高順位 (例: 1位。未参加の場合は0など)
}