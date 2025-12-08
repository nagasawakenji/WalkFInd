package nagasawakenji.walkfind.infra;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.CognitoSecret;
import nagasawakenji.walkfind.domain.dto.CognitoTokenResponse;
import nagasawakenji.walkfind.service.CognitoSecretLoader;
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

    private final CognitoSecretLoader secretLoader;

    private String domain;
    private String clientId;
    private String clientSecret;
    private String redirectUri;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    public CognitoOAuthClient(CognitoSecretLoader secretLoader) {
        this.secretLoader = secretLoader;
    }

    @PostConstruct
    public void init() {
        CognitoSecret secret = secretLoader.load();

        this.clientId = secret.clientId();
        this.clientSecret = secret.clientSecret();
        this.domain = secret.domain();
        this.redirectUri = secret.redirectUri();
        if (this.domain.endsWith("/")) {
            this.domain = this.domain.substring(0, this.domain.length() - 1);
        }

        log.info("Cognito secrets loaded successfully");
    }

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

        log.info("[Cognito] Token request -> url={}, code={}, clientId={}, redirectUri={}",
                tokenUrl, code, clientId, redirectUri);

        try {
            ResponseEntity<String> response =
                    restTemplate.exchange(tokenUrl, HttpMethod.POST, request, String.class);

            log.info("[Cognito] Token response status={}, body={}",
                    response.getStatusCode(), response.getBody());

            JsonNode json = objectMapper.readTree(response.getBody());

            return CognitoTokenResponse.builder()
                    .idToken(json.get("id_token").asText())
                    .accessToken(json.get("access_token").asText())
                    .refreshToken(json.path("refresh_token").asText(null))
                    .expiresIn(json.get("expires_in").asInt())
                    .build();

        } catch (org.springframework.web.client.HttpClientErrorException e) {
            // ここで Cognito からのエラーレスポンスを全部見る
            log.error("[Cognito] Token request failed. status={}, body={}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Cognito token response", e);
        }
    }
}