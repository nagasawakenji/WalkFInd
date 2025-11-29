package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.ContestStatusUpdateResult;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
@Slf4j
@RequiredArgsConstructor
public class ContestStatusBatchService {

    private final ContestMapper contestMapper;

    @Transactional
    public ContestStatusUpdateResult updateAllStatuses() {
        OffsetDateTime now = OffsetDateTime.now();

        // UPCOMING → IN_PROGRESS
        int inProgress = contestMapper.updateToInProgress(now);

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
