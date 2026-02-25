package com.lotus.game.security;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Component
@ConfigurationProperties(prefix = "app.jwt")
public class JwtProperties {

    private String secret;
    private long accessTokenExpirationSeconds = 900;   // 15 min
    private long refreshTokenExpirationSeconds = 604800; // 7 days

    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }

    public long getAccessTokenExpirationSeconds() {
        return accessTokenExpirationSeconds;
    }

    public void setAccessTokenExpirationSeconds(long accessTokenExpirationSeconds) {
        this.accessTokenExpirationSeconds = accessTokenExpirationSeconds;
    }

    public long getRefreshTokenExpirationSeconds() {
        return refreshTokenExpirationSeconds;
    }

    public void setRefreshTokenExpirationSeconds(long refreshTokenExpirationSeconds) {
        this.refreshTokenExpirationSeconds = refreshTokenExpirationSeconds;
    }

    public SecretKey getSecretKey() {
        byte[] keyBytes = getSecretKeyBytes();
        return new SecretKeySpec(keyBytes, 0, Math.min(keyBytes.length, 32), "HmacSHA256");
    }

    public byte[] getSecretKeyBytes() {
        byte[] raw = secret != null && !secret.isBlank()
                ? secret.getBytes(StandardCharsets.UTF_8)
                : "default-secret-key-at-least-256-bits-for-hs256!!!!!!!!".getBytes(StandardCharsets.UTF_8);
        if (raw.length < 32) {
            byte[] padded = new byte[32];
            System.arraycopy(raw, 0, padded, 0, raw.length);
            return padded;
        }
        return raw.length > 32 ? java.util.Arrays.copyOf(raw, 32) : raw;
    }
}
