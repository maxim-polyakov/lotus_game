package com.lotus.game.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Хранилище OAuth-кодов. Режим задаётся app.oauth.code-store:
 * - memory (по умолчанию) — для одного инстанса, без Redis
 * - redis — для нескольких инстансов за балансировщиком, нужен общий Redis
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OAuthCodeStore {

    private static final String REDIS_PREFIX = "oauth:code:";
    private static final Duration TTL = Duration.ofMinutes(2);

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Value("${app.oauth.code-store:memory}")
    private String mode;

    private final ConcurrentHashMap<String, Entry> memoryStore = new ConcurrentHashMap<>();

    public String put(String accessToken, String refreshToken, long expiresInSeconds) {
        String code = UUID.randomUUID().toString().replace("-", "");
        Map<String, Object> payload = Map.of(
                "accessToken", accessToken,
                "refreshToken", refreshToken,
                "expiresIn", expiresInSeconds
        );
        if ("redis".equalsIgnoreCase(mode)) {
            try {
                String json = objectMapper.writeValueAsString(payload);
                redisTemplate.opsForValue().set(REDIS_PREFIX + code, json, TTL);
            } catch (Exception e) {
                log.warn("Redis OAuth store failed, falling back to memory: {}", e.getMessage());
                memoryStore.put(code, new Entry(System.currentTimeMillis(), payload));
            }
        } else {
            memoryStore.put(code, new Entry(System.currentTimeMillis(), payload));
        }
        log.debug("OAuthCodeStore: put code {} (mode={}, memorySize={})", code.substring(0, 8) + "...", mode, memoryStore.size());
        return code;
    }

    public Map<String, Object> getAndRemove(String code) {
        if ("redis".equalsIgnoreCase(mode)) {
            try {
                String key = REDIS_PREFIX + code;
                String json = redisTemplate.opsForValue().get(key);
                if (json == null) {
                    log.warn("OAuthCodeStore: code not found in Redis");
                    return null;
                }
                redisTemplate.delete(key);
                log.debug("OAuthCodeStore: code found in Redis");
                return objectMapper.readValue(json, new TypeReference<>() {});
            } catch (Exception e) {
                log.warn("Redis OAuth get failed: {}", e.getMessage());
                return null;
            }
        }
        Entry entry = memoryStore.remove(code);
        if (entry == null) {
            log.warn("OAuthCodeStore: code not found (mode={}, memorySize={})", mode, memoryStore.size());
            return null;
        }
        if (System.currentTimeMillis() - entry.createdAt > TTL.toMillis()) {
            log.warn("OAuthCodeStore: code expired");
            return null;
        }
        log.debug("OAuthCodeStore: code found and removed");
        return entry.payload;
    }

    private record Entry(long createdAt, Map<String, Object> payload) {}
}
