package nagasawakenji.WalkFind.domain.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.OffsetDateTime;

/**
 * user_profilesテーブルに対応するモデルクラス。
 */
@Data
@NoArgsConstructor
public class UserProfile {

    // PK/FK: users.id
    private String userId;

    // 公開プロフィール情報
    private String profileImageUrl;
    private String bio;

    // デノーマライズされた統計情報
    private int totalPosts;
    private int totalContestsEntered;
    private int bestRank;

    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}