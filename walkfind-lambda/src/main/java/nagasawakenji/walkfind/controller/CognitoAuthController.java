package nagasawakenji.walkfind.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import nagasawakenji.walkfind.domain.dto.CognitoTokenRequest;
import nagasawakenji.walkfind.domain.dto.CognitoTokenResponse;
import nagasawakenji.walkfind.exception.AuthenticationProcessingException;
import nagasawakenji.walkfind.service.AuthApplicationService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Value;

import java.util.Map;


@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class CognitoAuthController {

    private final AuthApplicationService authApplicationService;

    // Cookie attributes (override per environment via application-*.properties)
    // prod (Vercel -> API Gateway cross-site): sameSite=None, secure=true
    // local (http://localhost): sameSite=Lax, secure=false
    @Value("${app.cookie.sameSite:None}")
    private String cookieSameSite;

    @Value("${app.cookie.secure:true}")
    private boolean cookieSecure;

    @PostMapping("/cognito/login")
    public ResponseEntity<CognitoTokenResponse> login(
            @RequestBody @Valid CognitoTokenRequest request
    ) {
        CognitoTokenResponse token =
                authApplicationService.loginWithCognito(request.getCode());

        // Browsers reject SameSite=None cookies unless Secure=true.
        // If running without HTTPS (e.g., localhost), fall back to Lax.
        String sameSite = cookieSameSite;
        if (!cookieSecure && "None".equalsIgnoreCase(sameSite)) {
            sameSite = "Lax";
        }

        // refreshToken を HttpOnly Cookie にセット
        ResponseCookie refreshCookie = ResponseCookie.from("refresh_token", token.getRefreshToken())
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .sameSite(sameSite)
                .maxAge(token.getExpiresIn())
                .build();

        // access_token も HttpOnly Cookie にセット
        ResponseCookie accessCookie = ResponseCookie.from("access_token", token.getAccessToken())
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .sameSite(sameSite)
                .maxAge(token.getExpiresIn())
                .build();

        // レスポンスボディには refreshToken accessToken を含めない
        CognitoTokenResponse safeResponse = CognitoTokenResponse.builder()
                .build();

        return ResponseEntity
                .status(HttpStatus.OK)
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .header(HttpHeaders.SET_COOKIE, accessCookie.toString())
                .body(safeResponse);
    }

    @ExceptionHandler(AuthenticationProcessingException.class)
    public ResponseEntity<?> handleAuthenticationProcessingException(AuthenticationProcessingException ex) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(Map.of(
                        "error", ex.getErrorCode(),
                        "message", ex.getMessage()
                ));
    }
}