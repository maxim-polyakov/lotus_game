package com.lotus.game.service;

import com.lotus.game.entity.GameConfig;
import com.lotus.game.repository.GameConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@ConditionalOnBean(StorageService.class)
public class GameConfigService {

    public static final String KEY_VICTORY_SOUND = "victorySoundUrl";
    public static final String KEY_DEFEAT_SOUND = "defeatSoundUrl";
    public static final String KEY_DRAW_SOUND = "drawSoundUrl";

    private final GameConfigRepository configRepository;
    private final StorageService storageService;

    @Transactional(readOnly = true)
    public Map<String, String> getGameSounds() {
        Map<String, String> result = new HashMap<>();
        configRepository.findByConfigKey(KEY_VICTORY_SOUND).ifPresent(c -> result.put(KEY_VICTORY_SOUND, c.getConfigValue()));
        configRepository.findByConfigKey(KEY_DEFEAT_SOUND).ifPresent(c -> result.put(KEY_DEFEAT_SOUND, c.getConfigValue()));
        configRepository.findByConfigKey(KEY_DRAW_SOUND).ifPresent(c -> result.put(KEY_DRAW_SOUND, c.getConfigValue()));
        return result;
    }

    @Transactional
    public String uploadGameSound(String key, MultipartFile file) throws IOException {
        if (!KEY_VICTORY_SOUND.equals(key) && !KEY_DEFEAT_SOUND.equals(key) && !KEY_DRAW_SOUND.equals(key)) {
            throw new IllegalArgumentException("Invalid sound key: " + key);
        }
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Файл не прикреплён");
        }
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
    public void deleteGameSound(String key) {
        if (!KEY_VICTORY_SOUND.equals(key) && !KEY_DEFEAT_SOUND.equals(key) && !KEY_DRAW_SOUND.equals(key)) {
            throw new IllegalArgumentException("Invalid sound key: " + key);
        }
        configRepository.findByConfigKey(key).ifPresent(c -> {
            if (c.getConfigValue() != null) {
                storageService.deleteByUrl(c.getConfigValue());
            }
            configRepository.delete(c);
        });
    }
}
