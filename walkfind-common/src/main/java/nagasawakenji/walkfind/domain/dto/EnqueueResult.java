package nagasawakenji.walkfind.domain.dto;

public record EnqueueResult(
        boolean ok,
        String queueUrl,
        String messageId,
        String requestId,
        String errorType,
        String errorMessage
) {}