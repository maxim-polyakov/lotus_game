package com.lotus.game.controller;

import com.lotus.game.service.GameConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@ConditionalOnBean(GameConfigService.class)
public class GameSettingsController {

    private final GameConfigService gameConfigService;

    @GetMapping("/api/settings/game-sounds")
    public ResponseEntity<Map<String, String>> getGameSounds() {
        return ResponseEntity.ok(gameConfigService.getGameSounds());
    }

    @PostMapping(value = "/api/admin/settings/victory-sound", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> uploadVictorySound(
            @RequestParam("sound") MultipartFile file,
            @AuthenticationPrincipal com.lotus.game.security.GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        return uploadSound(GameConfigService.KEY_VICTORY_SOUND, file);
    }

    @DeleteMapping("/api/admin/settings/victory-sound")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deleteVictorySound(
            @AuthenticationPrincipal com.lotus.game.security.GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        return deleteSound(GameConfigService.KEY_VICTORY_SOUND);
    }

    @PostMapping(value = "/api/admin/settings/defeat-sound", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> uploadDefeatSound(
            @RequestParam("sound") MultipartFile file,
            @AuthenticationPrincipal com.lotus.game.security.GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        return uploadSound(GameConfigService.KEY_DEFEAT_SOUND, file);
    }

    @DeleteMapping("/api/admin/settings/defeat-sound")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deleteDefeatSound(
            @AuthenticationPrincipal com.lotus.game.security.GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        return deleteSound(GameConfigService.KEY_DEFEAT_SOUND);
    }

    @PostMapping(value = "/api/admin/settings/draw-sound", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> uploadDrawSound(
            @RequestParam("sound") MultipartFile file,
            @AuthenticationPrincipal com.lotus.game.security.GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        return uploadSound(GameConfigService.KEY_DRAW_SOUND, file);
    }

    @DeleteMapping("/api/admin/settings/draw-sound")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deleteDrawSound(
            @AuthenticationPrincipal com.lotus.game.security.GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        return deleteSound(GameConfigService.KEY_DRAW_SOUND);
    }

    private ResponseEntity<Map<String, String>> uploadSound(String key, MultipartFile file) {
        try {
            String url = gameConfigService.uploadGameSound(key, file);
            return ResponseEntity.ok(Map.of(key, url));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    private ResponseEntity<Map<String, String>> deleteSound(String key) {
        try {
            gameConfigService.deleteGameSound(key);
            return ResponseEntity.ok(Map.of(key, ""));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
