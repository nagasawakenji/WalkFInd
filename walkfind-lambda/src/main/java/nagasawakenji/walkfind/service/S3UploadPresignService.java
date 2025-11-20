package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;

import java.net.URL;
import java.time.Duration;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class S3UploadPresignService {

    private final S3Presigner presigner;
    private final String bucket = "walkfind-photos";

    /**
     * 指定された key（例: contest-model/123/photo.jpg）でアップロード用のPresigned URLを発行
     */
    public URL generateUploadUrl(String key) {
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