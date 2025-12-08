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

import java.util.Map;


@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class CognitoAuthController {

    private final AuthApplicationService authApplicationService;

    @PostMapping("/cognito/login")
    public ResponseEntity<CognitoTokenResponse> login(
            @RequestBody @Valid CognitoTokenRequest request
    ) {
        CognitoTokenResponse token =
                authApplicationService.loginWithCognito(request.getCode());

        // refreshToken を HttpOnly Cookie にセット
        ResponseCookie refreshCookie = ResponseCookie.from("refresh_token", token.getRefreshToken())
                .httpOnly(true)
                .secure(true)
                .path("/")
                .sameSite("Lax")
                .maxAge(token.getExpiresIn())
                .build();

        // レスポンスボディには refreshToken を含めない
        CognitoTokenResponse safeResponse = CognitoTokenResponse.builder()
                .idToken(token.getIdToken())
                .accessToken(token.getAccessToken())
                .expiresIn(token.getExpiresIn())
                .refreshToken(null)
                .build();

        return ResponseEntity
                .status(HttpStatus.OK)
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
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