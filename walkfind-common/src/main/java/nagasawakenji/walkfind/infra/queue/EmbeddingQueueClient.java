package nagasawakenji.walkfind.infra.queue;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.config.SqsConfig;
import nagasawakenji.walkfind.domain.dto.EmbeddingJobMessage;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;

@Component
@RequiredArgsConstructor
@Slf4j
public class EmbeddingQueueClient {

    private final SqsClient sqsClient;
    private final SqsProperties props;
    private final ObjectMapper objectMapper;

    public void enqueue(EmbeddingJobMessage msg) {
        try {
            String body = objectMapper.writeValueAsString(msg);

            sqsClient.sendMessage(SendMessageRequest.builder()
                            .queueUrl(props.getQueueUrl())
                            .messageBody(body)
                            .build());

            log.info("Enqueued embedding job. queueUrl={}, contestId={}, photoType={}, photoId={}",
                    props.getQueueUrl(), msg.getContestId(), msg.getPhotoType(), msg.getPhotoId());
        } catch (Exception e) {
            // DBコミット後なので、ベストエフォートで
            throw new RuntimeException("Failed to enqueue embedding job", e);
        }
    }
}
