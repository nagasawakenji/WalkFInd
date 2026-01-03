package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.ContestStatusUpdateResult;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class ContestStatusBatchService {

    private final ContestMapper contestMapper;
    private final ContestProjectionEventPublisher contestProjectionEventPublisher;

    @Value("${app.ml.modelVersion:openclip-vitb32-v1}")
    private String modelVersion;

    @Transactional
    public ContestStatusUpdateResult updateAllStatuses() {
        OffsetDateTime now = OffsetDateTime.now();

        // UPCOMING → IN_PROGRESS
        List<Long> movedToInProgressIds = contestMapper.updateToInProgressReturningIds(now);
        int inProgress = movedToInProgressIds.size();

        if (inProgress > 0) {
            for (Long contestId : movedToInProgressIds) {
                // Best-effort: enqueue PCA basis build for this contest when it becomes IN_PROGRESS.
                contestProjectionEventPublisher.publishBecameInProgress(contestId, modelVersion);
            }
            log.info("[BATCH] published ContestBecameInProgressEvent. now={}, count={}, modelVersion={}", now, inProgress, modelVersion);
        }

        // IN_PROGRESS → CLOSED_VOTING
        int closedVoting = contestMapper.updateToClosedVoting(now);

        // CLOSED_VOTING → ANNOUNCED
        int announced = contestMapper.updateToAnnouncedIfCalculated();

        return ContestStatusUpdateResult.builder()
                .movedToInProgress(inProgress)
                .movedToClosedVoting(closedVoting)
                .movedToAnnounced(announced)
                .build();
    }

}
