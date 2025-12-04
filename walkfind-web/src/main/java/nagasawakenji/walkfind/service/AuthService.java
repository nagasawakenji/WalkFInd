package nagasawakenji.walkfind.service;

import org.springframework.stereotype.Service;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

@Service
public class AuthService {

    /**
     * 認証済みユーザーIDを取得
     * 本番（Lambda）は JWT から取得し、ローカルやテストでは name を返す。
     */
    public String getAuthenticatedUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalStateException("User is not authenticated");
        }

        // JWT (Cognito) が利用できる場合は sub を使用
        if (authentication instanceof JwtAuthenticationToken jwtAuth) {
            return jwtAuth.getToken().getSubject();
        }

        // それ以外（テストや簡易認証）では name を使用
        return authentication.getName();
    }
}