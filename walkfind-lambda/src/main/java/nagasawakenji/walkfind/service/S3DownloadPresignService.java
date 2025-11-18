package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.net.URL;
import java.time.Duration;

@Service
@Slf4j
@RequiredArgsConstructor
public class S3DownloadPresignService {

    private final S3Presigner presigner;
    private final String bucket = "walkfind-photos";

    /**
     * 指定されたキーでダウンロード用のpresignUrlを作成
     * @param key
     * @return URL
     */
    public URL generatedDownloadUrl(String key) {
        GetObjectRequest objectRequest = GetObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .build();

        PresignedGetObjectRequest presigned = presigner.presignGetObject(
                p -> p.signatureDuration(Duration.ofMinutes(10)) // 10分有効
                        .getObjectRequest(objectRequest)
        );

        return presigned.url();
    }
}
