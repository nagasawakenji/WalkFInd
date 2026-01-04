package nagasawakenji.walkfind.infra.queue;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.EnqueueResult;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;
import software.amazon.awssdk.services.sqs.model.SendMessageResponse;
import software.amazon.awssdk.services.sqs.model.SqsException;

@Component
@RequiredArgsConstructor
@Slf4j
public class MlWorkerQueueClient {

    private final SqsClient sqsClient;
    private final SqsProperties props;
    private final ObjectMapper objectMapper;

    public EnqueueResult enqueue(Object msg, String logKey) {
        String queueUrl = props.getQueueUrl();

        if (queueUrl == null || queueUrl.isBlank()) {
            String env = System.getenv("EMBEDDING_QUEUE_URL");
            log.error("SQS queueUrl is empty. props.queueUrl={}, env(EMBEDDING_QUEUE_URL)={}", queueUrl, env);
            return new EnqueueResult(false, queueUrl, null, null, "CONFIG", "queueUrl is empty");
        }

        try {
            String body = objectMapper.writeValueAsString(msg);

            SendMessageResponse resp = sqsClient.sendMessage(
                    SendMessageRequest.builder()
                            .queueUrl(queueUrl)
                            .messageBody(body)
                            .build()
            );

            String messageId = resp.messageId();
            // AWS SDK v2: requestId は responseMetadata に入ることが多い
            String requestId = resp.responseMetadata() != null ? resp.responseMetadata().requestId() : null;

            log.info("Enqueued ml-worker job. key={}, queueUrl={}, messageId={}, requestId={}, bodySize={}",
                    logKey, queueUrl, messageId, requestId, body.length());

            return new EnqueueResult(true, queueUrl, messageId, requestId, null, null);

        } catch (SqsException e) {
            String code = e.awsErrorDetails() != null ? e.awsErrorDetails().errorCode() : null;
            String msgText = e.awsErrorDetails() != null ? e.awsErrorDetails().errorMessage() : e.getMessage();

            log.error("SQS send failed. status={}, code={}, message={}, requestId={}, queueUrl={}",
                    e.statusCode(), code, msgText, e.requestId(), queueUrl, e);

            return new EnqueueResult(false, queueUrl, null, e.requestId(), "SQS:" + code, msgText);

        } catch (SdkClientException e) {
            // ここは「VPC/NAT/endpoint なし」などネットワーク系が多い
            log.error("SQS client/network failed. queueUrl={}", queueUrl, e);
            return new EnqueueResult(false, queueUrl, null, null, "SDK_CLIENT", e.getMessage());

        } catch (Exception e) {
            log.error("Failed to enqueue ml-worker job. queueUrl={}", queueUrl, e);
            return new EnqueueResult(false, queueUrl, null, null, "UNKNOWN", e.getMessage());
        }
    }
}