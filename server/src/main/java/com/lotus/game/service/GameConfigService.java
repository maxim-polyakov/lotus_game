package com.lotus.game.service;

import com.lotus.game.config.RedisCacheConfig;
import com.lotus.game.dto.game.PostMatchDropSettingsDto;
import com.lotus.game.entity.GameConfig;
import com.lotus.game.repository.GameConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class GameConfigService {

    public static final String KEY_VICTORY_SOUND = "victorySoundUrl";
    public static final String KEY_DEFEAT_SOUND = "defeatSoundUrl";
    public static final String KEY_DRAW_SOUND = "drawSoundUrl";

    public static final String KEY_POST_MATCH_WEIGHT_GOLD = "postMatchDrop.weightGold";
    public static final String KEY_POST_MATCH_WEIGHT_DUST = "postMatchDrop.weightDust";
    public static final String KEY_POST_MATCH_WEIGHT_HERO = "postMatchDrop.weightHero";
    public static final String KEY_POST_MATCH_GOLD_MIN = "postMatchDrop.goldMin";
    public static final String KEY_POST_MATCH_GOLD_MAX = "postMatchDrop.goldMax";
    public static final String KEY_POST_MATCH_DUST_MIN = "postMatchDrop.dustMin";
    public static final String KEY_POST_MATCH_DUST_MAX = "postMatchDrop.dustMax";

    private final GameConfigRepository configRepository;
    private final ObjectProvider<StorageService> storageServiceProvider;

    private StorageService storageOrNull() {
        return storageServiceProvider.getIfAvailable();
    }

    private StorageService requireStorage() {
        StorageService s = storageOrNull();
        if (s == null) {
            throw new IllegalStateException("Облачное хранилище не настроено");
        }
        return s;
    }

    @Transactional(readOnly = true)
    @Cacheable(value = RedisCacheConfig.CACHE_GAME_SOUNDS, key = "'sounds'")
    public Map<String, String> getGameSounds() {
        Map<String, String> result = new HashMap<>();
        configRepository.findByConfigKey(KEY_VICTORY_SOUND).ifPresent(c -> result.put(KEY_VICTORY_SOUND, c.getConfigValue()));
        configRepository.findByConfigKey(KEY_DEFEAT_SOUND).ifPresent(c -> result.put(KEY_DEFEAT_SOUND, c.getConfigValue()));
        configRepository.findByConfigKey(KEY_DRAW_SOUND).ifPresent(c -> result.put(KEY_DRAW_SOUND, c.getConfigValue()));
        return result;
    }

    @Transactional
    @CacheEvict(value = RedisCacheConfig.CACHE_GAME_SOUNDS, allEntries = true)
    public String uploadGameSound(String key, MultipartFile file) throws IOException {
        if (!KEY_VICTORY_SOUND.equals(key) && !KEY_DEFEAT_SOUND.equals(key) && !KEY_DRAW_SOUND.equals(key)) {
            throw new IllegalArgumentException("Invalid sound key: " + key);
        }
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Файл не прикреплён");
        }
        StorageService storageService = requireStorage();
        String oldUrl = configRepository.findByConfigKey(key).map(GameConfig::getConfigValue).orElse(null);
        if (oldUrl != null) {
            storageService.deleteByUrl(oldUrl);
        }
        String url = storageService.uploadGameSound(file.getBytes(),
                file.getContentType(),
                file.getOriginalFilename() != null ? file.getOriginalFilename() : "sound.mp3");
        configRepository.save(GameConfig.builder().configKey(key).configValue(url).build());
        return url;
    }

    @Transactional
    @CacheEvict(value = RedisCacheConfig.CACHE_GAME_SOUNDS, allEntries = true)
    public void deleteGameSound(String key) {
        if (!KEY_VICTORY_SOUND.equals(key) && !KEY_DEFEAT_SOUND.equals(key) && !KEY_DRAW_SOUND.equals(key)) {
            throw new IllegalArgumentException("Invalid sound key: " + key);
        }
        StorageService storageService = storageOrNull();
        configRepository.findByConfigKey(key).ifPresent(c -> {
            if (c.getConfigValue() != null && storageService != null) {
                storageService.deleteByUrl(c.getConfigValue());
            }
            configRepository.delete(c);
        });
    }

    @Transactional(readOnly = true)
    public PostMatchDropSettingsDto getPostMatchDropSettings() {
        return PostMatchDropSettingsDto.builder()
                .weightGold(readInt(KEY_POST_MATCH_WEIGHT_GOLD, 40))
                .weightDust(readInt(KEY_POST_MATCH_WEIGHT_DUST, 40))
                .weightHero(readInt(KEY_POST_MATCH_WEIGHT_HERO, 20))
                .goldMin(readInt(KEY_POST_MATCH_GOLD_MIN, 15))
                .goldMax(readInt(KEY_POST_MATCH_GOLD_MAX, 75))
                .dustMin(readInt(KEY_POST_MATCH_DUST_MIN, 5))
                .dustMax(readInt(KEY_POST_MATCH_DUST_MAX, 30))
                .build();
    }

    @Transactional
    public PostMatchDropSettingsDto updatePostMatchDropSettings(PostMatchDropSettingsDto dto) {
        if (dto == null) {
            throw new IllegalArgumentException("Пустые настройки");
        }
        int wGold = clampNonNeg(dto.getWeightGold(), 40);
        int wDust = clampNonNeg(dto.getWeightDust(), 40);
        int wHero = clampNonNeg(dto.getWeightHero(), 20);

        int goldMin = clampNonNeg(dto.getGoldMin(), 15);
        int goldMax = clampNonNeg(dto.getGoldMax(), 75);
        int dustMin = clampNonNeg(dto.getDustMin(), 5);
        int dustMax = clampNonNeg(dto.getDustMax(), 30);

        if (goldMax < goldMin) {
            int t = goldMin;
            goldMin = goldMax;
            goldMax = t;
        }
        if (dustMax < dustMin) {
            int t = dustMin;
            dustMin = dustMax;
            dustMax = t;
        }

        if (wGold + wDust + wHero == 0) {
            wGold = 40;
            wDust = 40;
            wHero = 20;
        }

        upsertInt(KEY_POST_MATCH_WEIGHT_GOLD, wGold);
        upsertInt(KEY_POST_MATCH_WEIGHT_DUST, wDust);
        upsertInt(KEY_POST_MATCH_WEIGHT_HERO, wHero);
        upsertInt(KEY_POST_MATCH_GOLD_MIN, goldMin);
        upsertInt(KEY_POST_MATCH_GOLD_MAX, goldMax);
        upsertInt(KEY_POST_MATCH_DUST_MIN, dustMin);
        upsertInt(KEY_POST_MATCH_DUST_MAX, dustMax);

        return getPostMatchDropSettings();
    }

    private int readInt(String key, int def) {
        return configRepository.findByConfigKey(key)
                .map(GameConfig::getConfigValue)
                .map(this::parseIntOrDefault)
                .orElse(def);
    }

    private int parseIntOrDefault(String raw) {
        if (raw == null || raw.isBlank()) return 0;
        try {
            return Integer.parseInt(raw.trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private void upsertInt(String key, int value) {
        GameConfig cfg = configRepository.findByConfigKey(key).orElse(null);
        if (cfg == null) {
            configRepository.save(GameConfig.builder().configKey(key).configValue(String.valueOf(value)).build());
            return;
        }
        cfg.setConfigValue(String.valueOf(value));
        configRepository.save(cfg);
    }

    private static int clampNonNeg(int v, int def) {
        if (v < 0) return def;
        return v;
    }
}
