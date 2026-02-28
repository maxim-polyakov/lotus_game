package com.lotus.game.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Миграция: разрешить NULL в password_hash для пользователей Google OAuth.
 * Выполняется при старте приложения.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PasswordHashNullableMigration {

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void migrate() {
        try {
            jdbcTemplate.execute("ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL");
            log.info("Migration: password_hash column now allows NULL (for Google OAuth users)");
        } catch (Exception e) {
            log.debug("Migration password_hash nullable: {} (may already be applied)", e.getMessage());
        }
    }
}
