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
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.UUID;

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

        log.info("Cognito secrets loaded. domainHost={}, clientIdMasked={}, redirectUriHost={}",
                hostOnly(this.domain),
                maskId(this.clientId),
                hostOnly(this.redirectUri));
    }

    public CognitoTokenResponse fetchToken(String code) {

        String opId = "cogtok-" + UUID.randomUUID().toString().substring(0, 8);
        String tokenUrl = domain + "/oauth2/token";

        long t0 = System.nanoTime();
        log.info("[{}] fetchToken start now={}, tokenUrlHost={}, codeLen={}",
                opId, OffsetDateTime.now(), hostOnly(tokenUrl),(code == null ? 0 : code.length()));

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

        try {
            long tHttp0 = System.nanoTime();
            ResponseEntity<String> response =
                    restTemplate.exchange(tokenUrl, HttpMethod.POST, request, String.class);
            long httpMs = msSince(tHttp0);

            int status = response.getStatusCodeValue();
            int bodySize = response.getBody() == null ? 0 : response.getBody().length();
            log.info("[{}] token http done status={} httpMs={} bodySize={}",
                    opId, status, httpMs, bodySize);

            long tParse0 = System.nanoTime();
            JsonNode json = objectMapper.readTree(response.getBody());
            long parseMs = msSince(tParse0);

            boolean hasId = json.hasNonNull("id_token");
            boolean hasAccess = json.hasNonNull("access_token");
            boolean hasRefresh = json.hasNonNull("refresh_token");
            int expiresIn = json.path("expires_in").asInt(-1);

            log.info("[{}] token parse done parseMs={} hasId={} hasAccess={} hasRefresh={} expiresIn={} totalMs={}",
                    opId, parseMs, hasId, hasAccess, hasRefresh, expiresIn, msSince(t0));


            if (!hasId || !hasAccess || expiresIn < 0) {
                log.error("[{}] token response missing required fields. hasId={} hasAccess={} expiresIn={}",
                        opId, hasId, hasAccess, expiresIn);
                throw new IllegalStateException("Cognito token response is missing required fields.");
            }

            return CognitoTokenResponse.builder()
                    .idToken(json.get("id_token").asText())
                    .accessToken(json.get("access_token").asText())
                    .refreshToken(json.path("refresh_token").asText(null))
                    .expiresIn(json.get("expires_in").asInt())
                    .build();

        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("[{}] token request failed (4xx). status={} bodyShort={} totalMs={}",
                    opId, e.getStatusCode().value(), shortBody(e.getResponseBodyAsString()), msSince(t0));
            throw e;
        } catch (RestClientResponseException e) {
            log.error("[{}] token request failed. status={} bodyShort={} totalMs={}",
                    opId, e.getRawStatusCode(), shortBody(e.getResponseBodyAsString()), msSince(t0));
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Cognito token response", e);
        }
    }

    // 以下はログ用のハンドラ
    private static long msSince(long nanoStart) {
        return (System.nanoTime() - nanoStart) / 1_000_000;
    }

    private static String hostOnly(String url) {
        if (url == null) {
            return "null";
        }

        String u = url.replace("https://", "").replace("http://", "");
        int slash = u.indexOf('/');

        return (slash >= 0) ? u.substring(0, slash) : u;
    }

    private static String maskId(String s) {
        if (s == null) {
            return "null";
        }

        if (s.length() <= 6) {
            return "***";
        }

        return s.substring(0, 3) + "***" + s.substring(s.length() - 3);
    }

    private static String shortBody(String body) {
        if (body == null) {
            return "null";
        }

        body = body.replaceAll("[\\r\\n\\t]", " ");
        int max = 300;
        return body.length() <= max ? body : body.substring(0, max) + "...(truncated)";
    }
}