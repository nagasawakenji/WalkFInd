package nagasawakenji.walkfind.service;

import nagasawakenji.walkfind.domain.dto.CognitoDeleteResponse;
import nagasawakenji.walkfind.domain.model.User;
import nagasawakenji.walkfind.domain.statusenum.CognitoDeleteStatus;
import nagasawakenji.walkfind.exception.AuthenticationProcessingException;


import nagasawakenji.walkfind.domain.dto.CognitoUser;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.CognitoTokenResponse;
import nagasawakenji.walkfind.exception.DatabaseOperationException;
import nagasawakenji.walkfind.infra.CognitoOAuthClient;
import nagasawakenji.walkfind.infra.mybatis.mapper.UserMapper;
import nagasawakenji.walkfind.infra.mybatis.mapper.UserProfileMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AdminDeleteUserRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.DeleteUserRequest;

import java.util.Optional;
import java.util.UUID;

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
    private final UserMapper userMapper;
    private final UserProfileMapper userProfileMapper;
    private final CognitoIdentityProviderClient cognitoIdentityProviderClient;
    private final LocalStorageUploadService localStorageUploadService;

    @Value("${aws.cognito.userPoolId}")
    private String userPoolId;

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
                        localStorageUploadService.deleteFile(currentImageUrl);
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
