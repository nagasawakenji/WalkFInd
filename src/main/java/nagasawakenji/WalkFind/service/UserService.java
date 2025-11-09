package nagasawakenji.WalkFind.service;

import nagasawakenji.WalkFind.domain.model.User;
import nagasawakenji.WalkFind.domain.dto.UserProfileResponse;
import nagasawakenji.WalkFind.domain.statusenum.UserRole;
import nagasawakenji.WalkFind.infra.mybatis.mapper.UserMapper;
import nagasawakenji.WalkFind.exception.UserStatusException;
import nagasawakenji.WalkFind.exception.DatabaseOperationException; // ★ 追加
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

/**
 * ユーザー情報のDB管理、同期、および基本情報取得を担うサービス。
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserMapper userMapper;

    // ユーザー情報の取得、新規登録を行う
    @Transactional
    public User syncUser(String cognitoId, String email, String username) {
        return userMapper.findById(cognitoId)
                .orElseGet(() -> {
                    // DBにユーザーが存在しない場合、新規登録する
                    User newUser = new User();

                    // 【修正点】ModelのSetterメソッド名を確認 (setUserId, setUserName, setActive を想定)
                    // 仮にModelのフィールドが id, username, isActive であれば、
                    // newUser.setId(cognitoId);
                    // newUser.setUsername(username);
                    // newUser.setIsActive(true);

                    newUser.setUserId(cognitoId);
                    newUser.setEmail(email);
                    newUser.setUserName(username);
                    newUser.setRole(UserRole.USER); // 暫定的に文字列のまま
                    newUser.setActive(true);

                    try {
                        int inserted = userMapper.insert(newUser);
                        if (inserted == 0) {
                            // 更新行数0の場合はDB操作失敗とみなす
                            throw new DatabaseOperationException("User insertion failed. Rows affected: 0");
                        }
                    } catch (Exception e) {
                        // DB側の制約違反（重複など）を含む例外を捕捉し、非チェック例外として再スローしてロールバックを確実にする
                        log.error("Failed to insert new user {} into DB.", cognitoId, e);
                        throw new DatabaseOperationException("Failed to insert new user into database.", e);
                    }

                    log.info("New user registered in DB: ID {}", cognitoId);
                    // 新しく登録されたUserモデルを返す
                    return newUser;
                });
    }


    @Transactional(readOnly = true)
    public UserProfileResponse getUserProfile(String userId) {
        User user = userMapper.findById(userId)
                .orElseThrow(() -> new UserStatusException("User not found.", "NOT_FOUND"));

        if (!user.isActive()) { // ModelのGetter名に合わせる
            throw new UserStatusException("Account is suspended.", "SUSPENDED");
        }

        // Modelから表示用DTOへの変換
        return UserProfileResponse.builder()
                .userId(user.getUserId())
                .username(user.getUserName())
                .email(user.getEmail()) // 公開情報としてメールアドレスを含めるか否かは要検討
                .joinDate(user.getCreatedAt())
                .build();
    }
}