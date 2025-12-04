package nagasawakenji.walkfind.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import nagasawakenji.walkfind.domain.dto.CognitoUser;
import nagasawakenji.walkfind.exception.AuthenticationProcessingException;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Service
public class CognitoUserParserService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Cognito の idToken (JWT) から
     *  - userId (sub)
     *  - username (cognito:username があればそれ、なければ sub)
     *  - email
     * を抽出する。
     */
    public CognitoUser parse(String idToken) {
        try {
            String[] parts = idToken.split("\\.");
            if (parts.length < 2) {
                throw new AuthenticationProcessingException(
                        "INVALID_JWT_FORMAT",
                        "Invalid JWT format"
                );
            }

            String payloadJson =
                    new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);

            JsonNode payload = objectMapper.readTree(payloadJson);

            // 必須フィールド検証
            if (!payload.hasNonNull("sub")) {
                throw new AuthenticationProcessingException(
                        "MISSING_SUB",
                        "Cognito token does not contain sub"
                );
            }

            if (!payload.hasNonNull("cognito:username")) {
                throw new AuthenticationProcessingException(
                        "MISSING_USERNAME",
                        "Cognito token does not contain cognito:username"
                );
            }

            if (!payload.hasNonNull("email")) {
                throw new AuthenticationProcessingException(
                        "MISSING_EMAIL",
                        "Cognito token does not contain email"
                );
            }

            String userId = payload.get("sub").asText();
            String username = payload.get("cognito:username").asText();
            String email = payload.get("email").asText();

            return new CognitoUser(userId, username, email);
        } catch (AuthenticationProcessingException e) {
            throw e;
        } catch (Exception e) {
            throw new AuthenticationProcessingException(
                    "TOKEN_PARSE_FAILED",
                    e,
                    "Failed to parse Cognito idToken"
            );
        }
    }

}
