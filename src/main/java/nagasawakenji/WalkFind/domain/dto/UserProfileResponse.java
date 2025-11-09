package nagasawakenji.WalkFind.domain.dto;

import lombok.Builder;
import lombok.Value;
import java.time.OffsetDateTime;

/**
 * ユーザーの公開可能なプロフィール情報をクライアントに返すためのDTO。
 */
@Value
@Builder
public class UserProfileResponse {
    private final String userId;
    private final String username;
    private final String email;
    private final OffsetDateTime joinDate;

    // 他にも、総投稿数などがあれば、Serviceで集計してここに追加する
}