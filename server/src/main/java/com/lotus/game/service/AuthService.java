package com.lotus.game.service;

import com.lotus.game.dto.auth.*;
import com.lotus.game.entity.User;
import com.lotus.game.repository.UserRepository;
import com.lotus.game.security.JwtService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final int VERIFICATION_CODE_VALID_MINUTES = 15;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final MailService mailService;

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already taken");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already registered");
        }

        String code = MailService.generateSixDigitCode();
        Instant expiresAt = Instant.now().plus(VERIFICATION_CODE_VALID_MINUTES, ChronoUnit.MINUTES);

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .emailVerified(false)
                .verificationCode(code)
                .verificationCodeExpiresAt(expiresAt)
                .build();

        user = userRepository.save(user);
        mailService.sendVerificationCode(user.getEmail(), code);

        return RegisterResponse.builder()
                .message("На вашу почту отправлен код подтверждения из 6 цифр.")
                .email(user.getEmail())
                .build();
    }

    @Transactional
    public AuthResponse verifyEmail(VerifyEmailRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Пользователь с таким email не найден"));

        if (user.isEmailVerified()) {
            return buildAuthResponse(user);
        }

        if (user.getVerificationCode() == null || user.getVerificationCodeExpiresAt() == null) {
            throw new IllegalArgumentException("Код подтверждения не найден или истёк. Зарегистрируйтесь снова.");
        }
        if (!user.getVerificationCode().equals(request.getCode())) {
            throw new IllegalArgumentException("Неверный код подтверждения");
        }
        if (Instant.now().isAfter(user.getVerificationCodeExpiresAt())) {
            throw new IllegalArgumentException("Срок действия кода истёк. Запросите новый код при повторной регистрации.");
        }

        user.setEmailVerified(true);
        user.setVerificationCode(null);
        user.setVerificationCodeExpiresAt(null);
        userRepository.save(user);

        return buildAuthResponse(user);
    }

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsernameOrEmail())
                .or(() -> userRepository.findByEmail(request.getUsernameOrEmail()))
                .orElseThrow(() -> new IllegalArgumentException("Invalid username/email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid username/email or password");
        }
        if (!user.isEmailVerified()) {
            return LoginResponse.builder()
                    .requiresEmailVerification(true)
                    .email(user.getEmail())
                    .build();
        }

        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        return buildLoginResponse(user);
    }

    @Transactional
    public void requestPasswordReset(String email) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return;
        }
        String code = MailService.generateSixDigitCode();
        Instant expiresAt = Instant.now().plus(VERIFICATION_CODE_VALID_MINUTES, ChronoUnit.MINUTES);
        user.setPasswordResetCode(code);
        user.setPasswordResetCodeExpiresAt(expiresAt);
        userRepository.save(user);
        mailService.sendPasswordResetCode(user.getEmail(), code);
    }

    @Transactional
    public void resetPassword(String email, String code, String newPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь с таким email не найден"));
        if (user.getPasswordResetCode() == null || user.getPasswordResetCodeExpiresAt() == null) {
            throw new IllegalArgumentException("Код сброса не найден или истёк. Запросите новый код.");
        }
        if (!user.getPasswordResetCode().equals(code)) {
            throw new IllegalArgumentException("Неверный код");
        }
        if (Instant.now().isAfter(user.getPasswordResetCodeExpiresAt())) {
            throw new IllegalArgumentException("Срок действия кода истёк. Запросите новый код.");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setPasswordResetCode(null);
        user.setPasswordResetCodeExpiresAt(null);
        userRepository.save(user);
    }

    public AuthResponse refresh(RefreshRequest request) {
        try {
            Claims claims = jwtService.parseToken(request.getRefreshToken());
            if (!jwtService.isRefreshToken(claims)) {
                throw new IllegalArgumentException("Invalid refresh token");
            }

            String username = claims.getSubject();
            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));

            return buildAuthResponse(user);
        } catch (JwtException e) {
            throw new IllegalArgumentException("Invalid or expired refresh token");
        }
    }

    private AuthResponse buildAuthResponse(User user) {
        String accessToken = jwtService.buildAccessToken(user);
        String refreshToken = jwtService.buildRefreshToken(user);
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresInSeconds(jwtService.getAccessTokenExpirationSeconds())
                .userId(user.getId())
                .username(user.getUsername())
                .roles(user.getRoles())
                .build();
    }

    private LoginResponse buildLoginResponse(User user) {
        AuthResponse auth = buildAuthResponse(user);
        return LoginResponse.builder()
                .requiresEmailVerification(false)
                .accessToken(auth.getAccessToken())
                .refreshToken(auth.getRefreshToken())
                .tokenType(auth.getTokenType())
                .expiresInSeconds(auth.getExpiresInSeconds())
                .userId(auth.getUserId())
                .username(auth.getUsername())
                .roles(auth.getRoles())
                .build();
    }
}
