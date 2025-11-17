package nagasawakenji.walkfind.service;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    // SecurityContextHolderから認証情報を取り出す
    public String getAuthenticatedUserId() {
        // SecurityContextHolderから認証オブジェクトを取り出す
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        // 認証オブジェクトの検証
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new SecurityException("Authentication not found or invalid .");
        }

        Object principal = authentication.getPrincipal();

        if (principal instanceof Jwt) {
            // JWTオブジェクトから'sub'を取得
            return ((Jwt) principal).getSubject();
        }
        else if (principal instanceof String) {
            return (String) principal;
        }

        throw new SecurityException("Authenticated principal type is unexpected.");

    }
}
