package nagasawakenji.walkfind.service;

import nagasawakenji.walkfind.exception.AuthenticationProcessingException;


import nagasawakenji.walkfind.domain.dto.CognitoUser;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.CognitoTokenResponse;
import nagasawakenji.walkfind.infra.CognitoOAuthClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * トークン取得サービス
 * email取得ロジックについて、userIdを用いたダミーemailを使用している
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthApplicationService {

    private final CognitoOAuthClient cognitoOAuthClient;
    private final CognitoUserParserService cognitoUserParserService;
    private final UserService userService;

    @Transactional
    public CognitoTokenResponse loginWithCognito(String code) {
        log.info("Exchanging Cognito authorization code");

        CognitoTokenResponse tokenResponse = cognitoOAuthClient.fetchToken(code);

        try {
            // jwtの解析
            CognitoUser parsedUser = cognitoUserParserService.parse(tokenResponse.getIdToken());

            log.info("Cognito login user: sub={}, username={}, email={}", parsedUser.userId(), parsedUser.username(), parsedUser.email());

            // usersテーブルとの同期
            userService.syncUser(parsedUser.userId(), parsedUser.email(), parsedUser.username());

        } catch (Exception e) {
            log.error("Failed to decode idToken or create local user", e);
            throw new AuthenticationProcessingException(
                    "User auto registration failed",
                    e,
                    "USER_SYNC_FAILED"
            );
        }

        return tokenResponse;
    }
}
