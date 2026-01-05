package nagasawakenji.walkfind.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import nagasawakenji.walkfind.domain.dto.CognitoTokenRequest;
import nagasawakenji.walkfind.domain.dto.CognitoTokenResponse;
import nagasawakenji.walkfind.service.AuthApplicationService;
import nagasawakenji.walkfind.exception.AuthenticationProcessingException;
import nagasawakenji.walkfind.service.AuthService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;


@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class CognitoAuthController {

    private final AuthApplicationService authApplicationService;
    private final AuthService authService;

    @PostMapping("/cognito/login")
    public ResponseEntity<CognitoTokenResponse> login(@RequestBody @Valid CognitoTokenRequest request) {
        CognitoTokenResponse token = authApplicationService.loginWithCognito(request.getCode());

        ResponseCookie refreshCookie = ResponseCookie.from("refresh_token", token.getRefreshToken())
                .httpOnly(true)
                .secure(false)
                .path("/")
                .sameSite("Lax")
                .maxAge(token.getExpiresIn())
                .build();

        ResponseCookie accessCookie = ResponseCookie.from("access_token", token.getAccessToken())
                .httpOnly(true)
                .secure(false)
                .path("/")
                .sameSite("Lax")
                .maxAge(token.getExpiresIn())
                .build();

        // ローカルでも本番寄せなら、ボディにトークンは返さない方が綺麗
        CognitoTokenResponse safeResponse = CognitoTokenResponse.builder().build();

        return ResponseEntity
                .status(HttpStatus.OK)
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .header(HttpHeaders.SET_COOKIE, accessCookie.toString())
                .body(safeResponse);
    }

    /**
     * アカウント削除 (退会) API
     * DELETE /api/v1/auth/me
     *
     * 1. サービス層でDB匿名化 & Cognito削除を実行
     * 2. 成功した場合、ブラウザのCookie (access_token, refresh_token) を削除してログアウト状態にする
     */
    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteAccount() {

        String userId = authService.getAuthenticatedUserId();;

        var response = authApplicationService.deleteAccount(userId);

        return switch (response.getStatus()) {
            case SUCCESS -> {
                // 退会成功時：Cookieを即時無効化するためのヘッダーを作成
                ResponseCookie clearRefreshCookie = ResponseCookie.from("refresh_token", "")
                        .httpOnly(true)
                        .secure(false) // 本番環境がHTTPSならtrue推奨ですが、loginの設定に合わせます
                        .path("/")
                        .sameSite("Lax")
                        .maxAge(0) // 0秒 = 即時削除
                        .build();

                ResponseCookie clearAccessCookie = ResponseCookie.from("access_token", "")
                        .httpOnly(true)
                        .secure(false)
                        .path("/")
                        .sameSite("Lax")
                        .maxAge(0) // 即時削除
                        .build();

                yield ResponseEntity.ok()
                        .header(HttpHeaders.SET_COOKIE, clearRefreshCookie.toString())
                        .header(HttpHeaders.SET_COOKIE, clearAccessCookie.toString())
                        .build();
            }

            case NOT_FOUND ->
                    ResponseEntity.status(HttpStatus.NOT_FOUND).build();

            case FORBIDDEN ->
                    ResponseEntity.status(HttpStatus.FORBIDDEN).build();

            default ->
                    ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        };
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