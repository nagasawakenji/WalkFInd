package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;

import java.net.URL;
import java.time.Duration;

@Service
@RequiredArgsConstructor
public class S3UploadPresignService {

    private final String bucket = "walkfind-photos";   // ← あなたのバケット名を設定

    /**
     * 指定された key（例: contest-model/123/photo.jpg）でアップロード用のPresigned URLを発行
     */
    public URL generateUploadUrl(String key) {

        S3Presigner presigner = S3Presigner.builder()
                .region(Region.AP_NORTHEAST_1)     // 東京リージョン
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();

        PutObjectRequest objectRequest = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType("image/jpeg")          // 必要に応じて変更
                .build();

        PresignedPutObjectRequest presigned = presigner.presignPutObject(
                p -> p.signatureDuration(Duration.ofMinutes(10)) // 10分有効
                        .putObjectRequest(objectRequest)
        );

        return presigned.url();
    }
}