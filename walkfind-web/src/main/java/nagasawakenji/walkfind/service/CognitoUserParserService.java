package nagasawakenji.walkfind.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import nagasawakenji.walkfind.domain.dto.CognitoUser;
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
     *  - email (local 環境用にダミー生成)
     * を抽出する。
     */
    public CognitoUser parse(String idToken) {
        try {
            String[] parts = idToken.split("\\.");
            if (parts.length < 2) {
                throw new IllegalArgumentException("Invalid JWT format");
            }

            String payloadJson =
                    new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);

            JsonNode payload = objectMapper.readTree(payloadJson);

            String userId = payload.get("sub").asText();

            String username;
            if (payload.has("cognito:username")) {
                username = payload.get("cognito:username").asText();
            } else {
                username = userId;
            }

            // local環境用のダミーemailを自動生成
            String email;
            if (payload.has("email")) {
                email = payload.get("email").asText();
            } else {
                email = "local+" + userId + "@example.com";
            }

            return new CognitoUser(userId, username, email);

        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Cognito idToken", e);
        }
    }


}
