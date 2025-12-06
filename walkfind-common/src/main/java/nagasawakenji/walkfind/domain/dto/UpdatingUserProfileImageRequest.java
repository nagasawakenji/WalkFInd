package nagasawakenji.walkfind.domain.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class UpdatingUserProfileImageRequest {

    /**
     * プロフィール画像のURL
     * 空文字 "" を送れば「画像を外す（非設定にする）」方針にしても良いです。
     */
    @NotNull(message = "profileImageUrl は null にはできません。")
    @Size(max = 512, message = "プロフィール画像URLは512文字以内で入力してください。")
    String profileImageUrl;

    @JsonCreator
    public UpdatingUserProfileImageRequest(
            @JsonProperty("profileImageUrl") String profileImageUrl
    ) {
        this.profileImageUrl = profileImageUrl;
    }
}