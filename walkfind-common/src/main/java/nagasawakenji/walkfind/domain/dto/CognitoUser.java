package nagasawakenji.walkfind.domain.dto;

public record CognitoUser(
        String userId,
        String username,
        String email
) {
}
