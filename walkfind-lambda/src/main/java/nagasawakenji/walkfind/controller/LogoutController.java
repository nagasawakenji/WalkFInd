package nagasawakenji.walkfind.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.LogoutRequest;
import nagasawakenji.walkfind.domain.dto.LogoutResponse;
import nagasawakenji.walkfind.domain.cookie.AuthCookieFactory;
import nagasawakenji.walkfind.service.LogoutService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Slf4j
public class LogoutController {

    private final LogoutService logoutService;
    private final AuthCookieFactory cookieFactory;

    @PostMapping("/logout")
    public ResponseEntity<LogoutResponse> logout(
            @RequestBody(required = false) LogoutRequest request,
            @CookieValue(name = "refresh_token", required = false) String refreshToken,
            Authentication authentication
    ) {
        // 未ログインなら authentication は null でもOK（冪等）
        String userId = (authentication != null) ? authentication.getName() : null;

        LogoutResponse body = logoutService.logout(
                userId,
                refreshToken,
                request != null ? request.getLogoutFromAllDevices() : null
        );

        HttpHeaders headers = new HttpHeaders();

        // HttpOnly cookie 
        headers.add(HttpHeaders.SET_COOKIE, cookieFactory.expireHttpOnlyCookie("access_token").toString());
        headers.add(HttpHeaders.SET_COOKIE, cookieFactory.expireHttpOnlyCookie("refresh_token").toString());

        return ResponseEntity.ok()
                .headers(headers)
                .body(body);
    }
}