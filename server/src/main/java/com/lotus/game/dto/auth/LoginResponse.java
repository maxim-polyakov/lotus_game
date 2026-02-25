package com.lotus.game.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

/**
 * Ответ на логин. Если почта не подтверждена — флаг requiresEmailVerification=true и email,
 * фронт перенаправляет на страницу ввода кода. Иначе — токены и данные пользователя.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {

    /** true — нужно показать страницу ввода 6-значного кода, токенов нет */
    private boolean requiresEmailVerification;
    /** Email для страницы верификации (заполнен при requiresEmailVerification=true) */
    private String email;

    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private Long expiresInSeconds;
    private Long userId;
    private String username;
    private Set<String> roles;
}
