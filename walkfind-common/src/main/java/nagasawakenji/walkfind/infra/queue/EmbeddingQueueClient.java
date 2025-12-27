package nagasawakenji.walkfind.infra.queue;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.config.SqsConfig;
import nagasawakenji.walkfind.domain.dto.EmbeddingJobMessage;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;
import software.amazon.awssdk.services.sqs.model.SqsException;


@Component
@RequiredArgsConstructor
@Slf4j
public class EmbeddingQueueClient {

    private final SqsClient sqsClient;
    private final SqsProperties props;
    private final ObjectMapper objectMapper;

    public void enqueue(EmbeddingJobMessage msg) {
        String queueUrl = props.getQueueUrl(); // ここが null/blank の可能性もある
        try {
            if (queueUrl == null || queueUrl.isBlank()) {
                log.error("SQS queueUrl is empty. props.queueUrl={}, env(EMBEDDING_QUEUE_URL)={}",
                        queueUrl, System.getenv("EMBEDDING_QUEUE_URL"));
                return; // ベストエフォート
            }

            String body = objectMapper.writeValueAsString(msg);

            sqsClient.sendMessage(SendMessageRequest.builder()
                    .queueUrl(queueUrl)
                    .messageBody(body)
                    .build());

            log.info("Enqueued embedding job. queueUrl={}, contestId={}, photoType={}, photoId={}",
                    queueUrl, msg.getContestId(), msg.getPhotoType(), msg.getPhotoId());

        } catch (SqsException e) {
            // AccessDenied / KMS / NonExistentQueue などがここに出る
            log.error("SQS send failed. status={}, code={}, message={}, requestId={}, queueUrl={}",
                    e.statusCode(),
                    e.awsErrorDetails() != null ? e.awsErrorDetails().errorCode() : null,
                    e.awsErrorDetails() != null ? e.awsErrorDetails().errorMessage() : null,
                    e.requestId(),
                    queueUrl,
                    e);
            return; // ベストエフォート（APIを500にしない）

        } catch (SdkClientException e) {
            // ネットワーク(VPC/NAT/Endpoint)系はここに出やすい
            log.error("SQS client/network failed. queueUrl={}", queueUrl, e);
            return;

        } catch (Exception e) {
            log.error("Failed to enqueue embedding job. queueUrl={}", queueUrl, e);
            return;
        }
    }
}
