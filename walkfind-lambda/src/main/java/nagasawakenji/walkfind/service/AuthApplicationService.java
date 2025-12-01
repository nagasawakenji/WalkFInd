package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.CognitoTokenResponse;
import nagasawakenji.walkfind.infra.CognitoOAuthClient;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthApplicationService {

    private final CognitoOAuthClient cognitoOAuthClient;

    public CognitoTokenResponse loginWithCognito(String code) {
        log.info("Exchanging Cognito authorization code");
        return cognitoOAuthClient.fetchToken(code);
    }
}
