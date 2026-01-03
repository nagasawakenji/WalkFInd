package nagasawakenji.walkfind.infra.queue;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;
import software.amazon.awssdk.services.sqs.model.SqsException;

@Component
@RequiredArgsConstructor
@Slf4j
public class MlWorkerQueueClient {

    private final SqsClient sqsClient;
    private final SqsProperties props;
    private final ObjectMapper objectMapper;

    public void enqueue(Object msg, String logKey) {
        String queueUrl = props.getQueueUrl();
        try {
            if (queueUrl == null || queueUrl.isBlank()) {
                log.error("SQS queueUrl is empty. props.queueUrl={}, env(EMBEDDING_QUEUE_URL)={}",
                        queueUrl, System.getenv("EMBEDDING_QUEUE_URL"));
                return;
            }

            String body = objectMapper.writeValueAsString(msg);

            sqsClient.sendMessage(SendMessageRequest.builder()
                    .queueUrl(queueUrl)
                    .messageBody(body)
                    .build());

            log.info("Enqueued ml-worker job. queueUrl={}, key={}, bodySize={}",
                    queueUrl, logKey, body.length());

        } catch (SqsException e) {
            log.error("SQS send failed. status={}, code={}, message={}, requestId={}, queueUrl={}",
                    e.statusCode(),
                    e.awsErrorDetails() != null ? e.awsErrorDetails().errorCode() : null,
                    e.awsErrorDetails() != null ? e.awsErrorDetails().errorMessage() : null,
                    e.requestId(),
                    queueUrl,
                    e);
        } catch (SdkClientException e) {
            log.error("SQS client/network failed. queueUrl={}", queueUrl, e);
        } catch (Exception e) {
            log.error("Failed to enqueue ml-worker job. queueUrl={}", queueUrl, e);
        }
    }
}