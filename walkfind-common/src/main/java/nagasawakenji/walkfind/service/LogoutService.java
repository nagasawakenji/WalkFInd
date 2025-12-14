package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.LogoutResponse;
import nagasawakenji.walkfind.domain.statusenum.LogoutStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@Slf4j
@RequiredArgsConstructor
public class LogoutService {


    /**
     * 現在は特に意味のないサービス。将来的に全てのデバイスで一斉ログインを実行したい場合や、データベースでログイン情報を持つ場合に使用する
     * @param userIdOrNull
     * @param refreshTokenOrNull
     * @param logoutFromAllDevices
     * @return
     */

    @Transactional
    public LogoutResponse logout(String userIdOrNull, String refreshTokenOrNull, Boolean logoutFromAllDevices) {

        // 冪等性: 何もなくても成功扱い
        if (refreshTokenOrNull == null || refreshTokenOrNull.isBlank()) {
            return LogoutResponse.builder()
                    .status(LogoutStatus.SUCCESS)
                    .message("ログアウトしました。")
                    .userId(userIdOrNull)
                    .loggedOutAt(Instant.now())
                    .build();
        }

        return LogoutResponse.builder()
                .status(LogoutStatus.SUCCESS)
                .message("ログアウトしました。")
                .userId(userIdOrNull)
                .loggedOutAt(Instant.now())
                .build();
    }
}