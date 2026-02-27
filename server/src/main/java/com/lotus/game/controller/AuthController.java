package com.lotus.game.controller;

import com.lotus.game.config.OAuthCodeStore;
import com.lotus.game.dto.auth.*;
import com.lotus.game.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthService authService;
    private final OAuthCodeStore oauthCodeStore;

    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(@Valid @RequestBody RegisterRequest request) {
        RegisterResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/verify-email")
    public ResponseEntity<AuthResponse> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        AuthResponse response = authService.verifyEmail(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        AuthResponse response = authService.refresh(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.requestPasswordReset(request.getEmail());
        return ResponseEntity.ok(Map.of("message", "Если email зарегистрирован, на него отправлен код из 6 цифр. Код действителен 15 минут."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request.getEmail(), request.getCode(), request.getNewPassword());
        return ResponseEntity.ok(Map.of("message", "Пароль успешно изменён. Войдите с новым паролем."));
    }

    @GetMapping("/oauth-tokens")
    public ResponseEntity<AuthResponse> getOAuthTokens(@RequestParam String code) {
        log.info("OAuth tokens request: code={}", code != null ? code.substring(0, Math.min(8, code.length())) + "..." : "null");
        Map<String, Object> data = oauthCodeStore.getAndRemove(code);
        if (data == null) {
            log.warn("OAuth tokens: code not found or expired");
            return ResponseEntity.badRequest().build();
        }
        log.info("OAuth tokens: success");
        return ResponseEntity.ok(AuthResponse.builder()
                .accessToken((String) data.get("accessToken"))
                .refreshToken((String) data.get("refreshToken"))
                .tokenType("Bearer")
                .expiresInSeconds(((Number) data.get("expiresIn")).longValue())
                .build());
    }
}
