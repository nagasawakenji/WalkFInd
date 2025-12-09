package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.CognitoTokenResponse;
import nagasawakenji.walkfind.infra.CognitoOAuthClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthApplicationService {

    private final CognitoOAuthClient cognitoOAuthClient;

    // ★ 修正1: UserMapper を削除し、UserService を追加
    // private final nagasawakenji.walkfind.infra.mybatis.mapper.UserMapper userMapper; // 削除
    private final UserService userService; // 追加

    @Transactional
    public CognitoTokenResponse loginWithCognito(String code) {
        log.info("Exchanging Cognito authorization code");

        // Cognito からトークン取得
        CognitoTokenResponse token = cognitoOAuthClient.fetchToken(code);

        try {
            // IDトークンをデコードしてユーザー情報を取得
            com.auth0.jwt.interfaces.DecodedJWT jwt =
                    com.auth0.jwt.JWT.decode(token.getIdToken());

            String sub = jwt.getSubject(); // users.id (CognitoのUUID)
            String username = jwt.getClaim("cognito:username").asString();
            String email = jwt.getClaim("email").asString();

            log.info("Cognito login user: sub={}, username={}, email={}", sub, username, email);

            // これにより、ユーザーが存在しない場合は作成され、
            // 「ユーザーはいるがプロフィールがない」場合も自動修復されます。
            userService.syncUser(sub, email, username);

        } catch (Exception e) {
            log.error("Failed to process Cognito ID token or sync user", e);
            throw new RuntimeException("Login process failed", e);
        }

        // 3. トークンを返却
        return token;
    }
}