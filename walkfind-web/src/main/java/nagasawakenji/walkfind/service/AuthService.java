package nagasawakenji.walkfind.service;

import org.springframework.stereotype.Service;

@Service
public class AuthService {

    /**
     * ローカル環境専用の認証ユーザーID取得メソッド
     * 本番（Lambda）は JWT から取得するが、
     * ローカルでは認証を行わず、固定のIDを返す。
     */
    public String getAuthenticatedUserId() {
        // ★ ローカル用ダミーユーザーID
        return "local-user";
    }
}