package nagasawakenji.walkfind.service.listener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.PcaBasisJobMessage;
import nagasawakenji.walkfind.domain.event.ContestBecameInProgressEvent;
import nagasawakenji.walkfind.domain.dto.EnqueueResult;
import nagasawakenji.walkfind.infra.queue.MlWorkerQueueClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.event.TransactionPhase;

@Component
@RequiredArgsConstructor
@Slf4j
public class ContestProjectionKickListener {

    private final MlWorkerQueueClient mlWorkerQueueClient;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onContestBecameInProgress(ContestBecameInProgressEvent e) {

        PcaBasisJobMessage msg = PcaBasisJobMessage.builder()
                .type("PCA_BASIS")                 // ★超重要（後述）
                .contestId(e.contestId())
                .modelVersion(e.modelVersion())
                .dim(3)
                .minReady(1)
                .build();

        String logKey = "PCA_BASIS contestId=" + e.contestId() + " modelVersion=" + e.modelVersion();

        EnqueueResult r = mlWorkerQueueClient.enqueue(msg, logKey);

        if (r.ok()) {
            log.info("[PCA_KICK] enqueued OK. {} messageId={} requestId={}", logKey, r.messageId(), r.requestId());
        } else {
            log.warn("[PCA_KICK] enqueue FAILED. {} errorType={} requestId={} errorMessage={}",
                    logKey, r.errorType(), r.requestId(), r.errorMessage());
        }
    }
}