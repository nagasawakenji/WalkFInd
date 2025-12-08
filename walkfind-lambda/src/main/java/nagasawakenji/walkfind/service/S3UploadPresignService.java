package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;

import java.net.URL;
import java.time.Duration;

@Service
@RequiredArgsConstructor
public class S3UploadPresignService {

    private final S3Presigner presigner;

    // template.yamlの環境変数 S3_BUCKET_NAME を読み込む
    // 読めない場合はデフォルト値 "walkfind-photos" を使用
    @Value("${S3_BUCKET_NAME:walkfind-photos}")
    private String bucket;

    /**
     * 指定された key と Content-Type でアップロード用のPresigned URLを発行
     * * @param key S3上の保存パス (例: contest-icons/1/uuid.png)
     * @param contentType ファイルのMIMEタイプ (例: image/png)
     */
    public URL generateUploadUrl(String key, String contentType) {

        // 署名付きリクエストの作成
        // ★重要: ここで指定する ContentType と、フロントエンドが送るヘッダーが完全一致する必要があります
        PutObjectRequest objectRequest = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(contentType) // 引数のcontentTypeを使用
                .build();

        PresignedPutObjectRequest presigned = presigner.presignPutObject(
                p -> p.signatureDuration(Duration.ofMinutes(10)) // 10分有効
                        .putObjectRequest(objectRequest)
        );

        return presigned.url();
    }
}