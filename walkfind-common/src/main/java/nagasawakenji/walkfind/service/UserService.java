package nagasawakenji.walkfind.service;

import nagasawakenji.walkfind.domain.model.User;
import nagasawakenji.walkfind.domain.dto.UserProfileResponse;
import nagasawakenji.walkfind.domain.model.UserProfile;
import nagasawakenji.walkfind.domain.statusenum.UserRole;
import nagasawakenji.walkfind.infra.mybatis.mapper.UserMapper;
import nagasawakenji.walkfind.exception.UserStatusException;
import nagasawakenji.walkfind.exception.DatabaseOperationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.infra.mybatis.mapper.UserProfileMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * ユーザー情報のDB管理、同期、および基本情報取得を担うサービス。
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserMapper userMapper;
    private final UserProfileMapper userProfileMapper;

    /**
     * ユーザー情報の取得・同期を行う。
     * ユーザーが存在しない場合は新規作成し、
     * プロフィールが存在しない場合（不整合データ）は自動修復する。
     */
    @Transactional
    public User syncUser(String cognitoId, String email, String username) {

        // まずユーザーテーブルを確認
        User user = userMapper.findById(cognitoId).orElse(null);

        if (user == null) {
            log.info("User not found in DB. Creating new user: {}", cognitoId);

            user = new User();
            user.setUserId(cognitoId);
            user.setEmail(email);
            user.setUserName(username);
            user.setRole(UserRole.USER);
            user.setActive(true);

            try {
                int insertedUser = userMapper.insert(cognitoId, username, email);
                if (insertedUser == 0) {
                    throw new DatabaseOperationException("User insertion failed. Rows affected: 0");
                }
            } catch (Exception e) {
                // DB操作失敗時はロールバックさせるため例外を投げる
                log.error("Failed to insert new user {} into DB.", cognitoId, e);
                throw new DatabaseOperationException("Failed to insert new user into database.", e);
            }
        } else {
            log.info("User found in DB: {}", cognitoId);
            // 必要に応じて、ここでCognito側の最新情報(email, username)でDBを更新する処理を入れても良い
        }

        // ユーザーが「新規作成」か「既存」かに関わらず、プロフィールデータが欠損していないか確認する。
        // これにより、過去の不整合データ（ユーザーだけいてプロフィールがない状態）をログイン時に修復できる。
        boolean profileExists = userProfileMapper.findByUserId(cognitoId).isPresent();

        if (!profileExists) {
            log.warn("UserProfile missing for user {}. Creating default profile (Auto-Repair).", cognitoId);

            UserProfile newProfile = new UserProfile();
            newProfile.setUserId(cognitoId);
            // 初期値が必要であればここでセット (例: newProfile.setBio(""); )

            try {
                int insertedProfile = userProfileMapper.insert(newProfile);
                if (insertedProfile == 0) {
                    throw new DatabaseOperationException("Profile insertion failed. Rows affected: 0");
                }
                log.info("Created missing profile for user: {}", cognitoId);
            } catch (Exception e) {
                log.error("Failed to insert profile for user {}", cognitoId, e);
                throw new DatabaseOperationException("Failed to insert profile.", e);
            }
        }

        return user;
    }


    @Transactional(readOnly = true)
    public UserProfileResponse getUserProfile(String userId) {
        User user = userMapper.findById(userId)
                .orElseThrow(() -> new UserStatusException("User not found.", "NOT_FOUND"));

        if (!user.isActive()) {
            throw new UserStatusException("Account is suspended.", "SUSPENDED");
        }

        // Modelから表示用DTOへの変換
        return UserProfileResponse.builder()
                .userId(user.getUserId())
                .username(user.getUserName())
                .email(user.getEmail())
                .joinDate(user.getCreatedAt())
                .build();
    }
}