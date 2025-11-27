package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;

@Service
@Slf4j
@RequiredArgsConstructor
public class S3DeleteService {

    private final S3Client s3Client;

    private final String bucket = "walkfind-photos";

    public void delete(String key) {
        s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .build());
    }
}
