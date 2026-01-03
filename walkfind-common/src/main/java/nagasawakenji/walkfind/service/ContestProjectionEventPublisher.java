package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import nagasawakenji.walkfind.domain.event.ContestBecameInProgressEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ContestProjectionEventPublisher {

    private final ApplicationEventPublisher publisher;

    public void publishBecameInProgress(Long contestId, String modelVersion) {
        publisher.publishEvent(new ContestBecameInProgressEvent(contestId, modelVersion));
    }
}
