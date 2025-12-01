package nagasawakenji.walkfind.infra;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.CognitoTokenResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Service
@Slf4j
public class CognitoOAuthClient {

    @Value("${cognito.domain}")
    private String domain;

    @Value("${cognito.client-id}")
    private String clientId;

    @Value("${cognito.client-secret}")
    private String clientSecret;

    @Value("${cognito.redirect-uri}")
    private String redirectUri;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    public CognitoTokenResponse fetchToken(String code) {

        String tokenUrl = domain + "/oauth2/token";

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "authorization_code");
        body.add("code", code);
        body.add("redirect_uri", redirectUri);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        String auth = clientId + ":" + clientSecret;
        String encodedAuth = Base64.getEncoder()
                .encodeToString(auth.getBytes(StandardCharsets.UTF_8));
        headers.set("Authorization", "Basic " + encodedAuth);

        HttpEntity<?> request = new HttpEntity<>(body, headers);

        ResponseEntity<String> response =
                restTemplate.exchange(tokenUrl, HttpMethod.POST, request, String.class);

        try {
            JsonNode json = objectMapper.readTree(response.getBody());

            return CognitoTokenResponse.builder()
                    .idToken(json.get("id_token").asText())
                    .accessToken(json.get("access_token").asText())
                    .refreshToken(json.get("refresh_token").asText())
                    .expiresIn(json.get("expires_in").asInt())
                    .build();

        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Cognito token response", e);
        }
    }
}