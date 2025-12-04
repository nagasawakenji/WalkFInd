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
    private final nagasawakenji.walkfind.infra.mybatis.mapper.UserMapper userMapper;

    @Transactional
    public CognitoTokenResponse loginWithCognito(String code) {
        log.info("Exchanging Cognito authorization code");

        // Cognito からトークン取得
        CognitoTokenResponse token = cognitoOAuthClient.fetchToken(code);

        try {
            // IDトークンをデコード
            com.auth0.jwt.interfaces.DecodedJWT jwt =
                    com.auth0.jwt.JWT.decode(token.getIdToken());

            String sub = jwt.getSubject(); // users.id
            String username = jwt.getClaim("cognito:username").asString();
            String email = jwt.getClaim("email").asString();

            log.info("Cognito login user: sub={}, username={}, email={}", sub, username, email);

            // users テーブルに存在するか確認
            var existing = userMapper.findById(sub);

            // 初回ログインなら users に INSERT
            if (existing.isEmpty()) {
                log.info("First login detected. Creating user in DB.");
                userMapper.insert(sub, username, email);
            }

        } catch (Exception e) {
            log.error("Failed to process Cognito ID token", e);
            throw new RuntimeException("Invalid Cognito ID token", e);
        }

        // ⑤ トークンはそのまま返却
        return token;
    }
}
