package nagasawakenji.WalkFind.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Value;

@Value
public class SubmitPhotoRequest {
    // 必須: どのコンテストへの投稿か
    @NotNull(message = "コンテストIDは必須です。")
    private final Long contestId;

    // 必須: Cloudflare R2/S3にアップロード済みの画像URL
    @NotBlank(message = "写真URLは必須です。")
    @Size(max = 512, message = "URLは512文字以内で入力してください。")
    private final String photoUrl;

    // 必須: 作品のタイトル
    @NotBlank(message = "タイトルは必須です。")
    @Size(max = 100, message = "タイトルは100文字以内で入力してください。")
    private final String title;

    // 任意: 作品の説明文
    @Size(max = 500, message = "説明文は500文字以内で入力してください。")
    private final String description;
}
