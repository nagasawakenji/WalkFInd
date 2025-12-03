package nagasawakenji.walkfind.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import nagasawakenji.walkfind.domain.dto.CognitoSecret;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueResponse;

@Service
@RequiredArgsConstructor
public class CognitoSecretLoader {

    public CognitoSecret load() {
        String secretName = "/walkfind/cognito/prod";
        String region = System.getenv().getOrDefault("AWS_REGION", "ap-northeast-1");

        try (SecretsManagerClient client =
                     SecretsManagerClient.builder()
                             .region(Region.of(region))
                             .build()) {

            GetSecretValueResponse response =
                    client.getSecretValue(GetSecretValueRequest.builder()
                            .secretId(secretName)
                            .build());

            JsonNode json = new ObjectMapper().readTree(response.secretString());

            return new CognitoSecret(
                    json.get("cognito_client_id").asText(),
                    json.get("cognito_client_secret").asText(),
                    json.get("cognito_domain").asText(),
                    json.get("cognito_redirect_uri").asText()
            );

        } catch (Exception e) {
            throw new RuntimeException("Failed to load Cognito secrets", e);
        }
    }
}