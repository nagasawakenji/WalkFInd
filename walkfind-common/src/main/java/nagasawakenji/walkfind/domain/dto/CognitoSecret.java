package nagasawakenji.walkfind.domain.dto;

public record CognitoSecret(
        String clientId,
        String clientSecret,
        String domain,
        String redirectUri
) {}