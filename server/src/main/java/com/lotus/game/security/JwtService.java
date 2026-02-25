package com.lotus.game.security;

import com.lotus.game.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class JwtService {

    private final JwtProperties jwtProperties;

    public String buildAccessToken(User user) {
        SecretKey key = jwtProperties.getSecretKey();
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(user.getUsername())
                .claim("userId", user.getId())
                .claim("roles", user.getRoles())
                .claim("type", "access")
                .issuedAt(new Date(now))
                .expiration(new Date(now + jwtProperties.getAccessTokenExpirationSeconds() * 1000L))
                .signWith(key)
                .compact();
    }

    public String buildRefreshToken(User user) {
        SecretKey key = jwtProperties.getSecretKey();
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(user.getUsername())
                .claim("userId", user.getId())
                .claim("type", "refresh")
                .issuedAt(new Date(now))
                .expiration(new Date(now + jwtProperties.getRefreshTokenExpirationSeconds() * 1000L))
                .signWith(key)
                .compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(Keys.hmacShaKeyFor(jwtProperties.getSecretKeyBytes()))
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isAccessToken(Claims claims) {
        return "access".equals(claims.get("type", String.class));
    }

    public boolean isRefreshToken(Claims claims) {
        return "refresh".equals(claims.get("type", String.class));
    }

    public Set<String> getRoles(Claims claims) {
        Object rolesObj = claims.get("roles");
        if (rolesObj == null) return Set.of();
        if (rolesObj instanceof java.util.List<?> list) {
            return list.stream().map(Object::toString).collect(Collectors.toSet());
        }
        return Set.of();
    }

    public long getAccessTokenExpirationSeconds() {
        return jwtProperties.getAccessTokenExpirationSeconds();
    }
}
