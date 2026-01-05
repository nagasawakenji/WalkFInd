package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.CognitoDeleteResponse;
import nagasawakenji.walkfind.domain.dto.CognitoTokenResponse;
import nagasawakenji.walkfind.domain.statusenum.CognitoDeleteStatus;
import nagasawakenji.walkfind.infra.CognitoOAuthClient;
import nagasawakenji.walkfind.infra.mybatis.mapper.UserMapper;
import nagasawakenji.walkfind.infra.mybatis.mapper.UserProfileMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AdminDeleteUserRequest;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthApplicationService {

    private final CognitoOAuthClient cognitoOAuthClient;
    private final UserMapper userMapper;
    private final UserProfileMapper userProfileMapper;
    private final S3DeleteService s3DeleteService;
    private final CognitoIdentityProviderClient cognitoIdentityProviderClient;

    @Value("${aws.cognito.userPoolId:}")
    private String userPoolId;

    // ★ 修正1: UserMapper を削除し、UserService を追加
    // private final nagasawakenji.walkfind.infra.mybatis.mapper.UserMapper userMapper; // 削除
    private final UserService userService; // 追加

    @Transactional
    public CognitoTokenResponse loginWithCognito(String code) {
        log.info("Exchanging Cognito authorization code");

        log.info("/api/v1/auth/login  ログインの処理を開始します  now_time:{}", OffsetDateTime.now());

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

        log.info("/api/v1/auth/login  トークンを返却します  now_time{}", OffsetDateTime.now());
        // トークンを返却
        return token;
    }

    @Transactional
    public CognitoDeleteResponse deleteAccount(String requiredUserId) {
        try {
            // ユーザー存在確認 (usersテーブル)
            var userOpt = userMapper.findById(requiredUserId);
            if (userOpt.isEmpty()) {
                return CognitoDeleteResponse.builder()
                        .status(CognitoDeleteStatus.NOT_FOUND)
                        .build();
            }

            try {
                var profileOpt = userProfileMapper.findByUserId(requiredUserId);
                if (profileOpt.isPresent()) {
                    String currentImageUrl = profileOpt.get().getProfileImageUrl();
                    if (currentImageUrl != null) {
                        s3DeleteService.delete(currentImageUrl);
                    }
                }
            } catch (Exception e) {
                // 退会をやめはしない
                log.warn("Failed to delete profile image for user: {}", requiredUserId, e);
            }

            // usersテーブルの匿名化 (Identity情報)
            String updatedUsername = "deletedUser_" + UUID.randomUUID().toString().substring(0, 8);
            String updatedEmail = "deleted_" + UUID.randomUUID().toString() + "@example.com";

            int userUpdated = userMapper.anonymizeUser(
                    requiredUserId,
                    updatedUsername,
                    updatedEmail,
                    false // is_active -> false
            );

            // user_profilesテーブルの匿名化 (公開情報)
            // 画像と自己紹介をNULLにする
            int profileUpdated = userProfileMapper.anonymizeProfile(requiredUserId);

            if (userUpdated == 0) {
                // ここで例外を投げればトランザクションはロールバックされ、元の状態に戻る
                throw new RuntimeException("Failed to update user record");
            }

            try {
                cognitoIdentityProviderClient.adminDeleteUser(AdminDeleteUserRequest.builder()
                        .userPoolId(userPoolId)
                        .username(userOpt.get().getUserName())
                        .build());

                log.info("Cognito user deleted successfully: {}", requiredUserId);

            } catch (Exception e) {
                // userが再び退会処理を実行しようとしても、すでにDB上ではデータが消えている
                // uiでは成功と出す

                log.error("Failed to delete user from Cognito (Orphaned Cognito User): {}", requiredUserId, e);
            }

            return CognitoDeleteResponse.builder()
                    .deletedId(requiredUserId)
                    .status(CognitoDeleteStatus.SUCCESS)
                    .build();

        } catch (Exception e) {
            log.error("Unexpected error during user delete. userId={}", requiredUserId, e);
            throw new RuntimeException("ユーザー情報削除中に予期せぬエラーが発生しました。", e);
        }
    }
}