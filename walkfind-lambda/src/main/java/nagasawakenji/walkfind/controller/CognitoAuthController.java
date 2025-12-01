package nagasawakenji.walkfind.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import nagasawakenji.walkfind.domain.dto.CognitoTokenRequest;
import nagasawakenji.walkfind.domain.dto.CognitoTokenResponse;
import nagasawakenji.walkfind.service.AuthApplicationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class CognitoAuthController {

    private final AuthApplicationService authApplicationService;

    @PostMapping("/cognito/login")
    public ResponseEntity<CognitoTokenResponse> login(
            @RequestBody @Valid CognitoTokenRequest request
    ) {
        CognitoTokenResponse token =
                authApplicationService.loginWithCognito(request.getCode());

        return ResponseEntity.ok(token);
    }
}