package nagasawakenji.walkfind.domain.event;

public record ContestBecameInProgressEvent(
        Long contestId,
        String modelVersion
) {}
