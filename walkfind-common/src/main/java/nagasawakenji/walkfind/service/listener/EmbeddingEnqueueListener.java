package nagasawakenji.walkfind.service.listener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.EmbeddingJobMessage;
import nagasawakenji.walkfind.domain.event.PhotoSubmittedEvent;
import nagasawakenji.walkfind.infra.queue.EmbeddingQueueClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
public class EmbeddingEnqueueListener {

    private final EmbeddingQueueClient queueClient;

    @Value("${walkfind.embedding.model-version:openclip-vitb32-v1}")
    private String modelVersion;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCommitted(PhotoSubmittedEvent e) {
        queueClient.enqueue(EmbeddingJobMessage.builder()
                .photoType(e.getPhotoType())
                .contestId(e.getContestId())
                .photoId(e.getPhotoId())
                .key(e.getKey())
                .modelVersion(modelVersion)
                .build());
    }
}
