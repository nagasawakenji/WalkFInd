package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Value;
import java.time.OffsetDateTime;

/**
 * ユーザーのプロフィール情報をクライアントに返すためのDTO。
 */
@Value
@Builder
public class UserProfileResponse {
    private final String userId;
    private final String username;
    private final String email;
    private final OffsetDateTime joinDate;

    // 他にも、総投稿数などがあれば、Serviceで集計してここに追加する
    private final String profileImageUrl;
    private final int totalPosts; // 総投稿写真数
    private final int totalContestsEntered; // 総参加コンテスト数
    private final int bestRank; // 過去最高順位 (例: 1位。未参加の場合は0など)
}