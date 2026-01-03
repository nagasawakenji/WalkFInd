package nagasawakenji.walkfind.service.listener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.PcaBasisJobMessage;
import nagasawakenji.walkfind.domain.event.ContestBecameInProgressEvent;
import nagasawakenji.walkfind.infra.queue.MlWorkerQueueClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.event.TransactionPhase;

@Component
@RequiredArgsConstructor
@Slf4j
public class ContestProjectionKickListener {

    private final MlWorkerQueueClient mlWorkerQueueClient;

    /**
     * DB更新が commit された後に送る
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onContestBecameInProgress(ContestBecameInProgressEvent e) {

        PcaBasisJobMessage msg = PcaBasisJobMessage.builder()
                .contestId(e.contestId())
                .modelVersion(e.modelVersion())
                .dim(3)
                .minReady(1)
                .build();

        String logKey = "PCA_BASIS contestId=" + e.contestId() + " modelVersion=" + e.modelVersion();
        mlWorkerQueueClient.enqueue(msg, logKey);

        log.info("[PCA_KICK] enqueued. {}", logKey);
    }
}