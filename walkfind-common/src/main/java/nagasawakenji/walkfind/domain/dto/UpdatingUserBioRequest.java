package nagasawakenji.walkfind.domain.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class UpdatingUserBioRequest {

    /**
     * 自己紹介文
     * 空文字 "" を送れば「bio を空にする」挙動にできます。
     */
    @NotNull(message = "bio は null にはできません。")
    @Size(max = 1000, message = "自己紹介文は1000文字以内で入力してください。")
    String bio;

    @JsonCreator
    public UpdatingUserBioRequest(
            @JsonProperty("bio") String bio
    ) {
        this.bio = bio;
    }
}