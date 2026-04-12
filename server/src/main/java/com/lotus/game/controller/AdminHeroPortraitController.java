package com.lotus.game.controller;

import com.lotus.game.security.GameUserDetails;
import com.lotus.game.service.HeroCatalog;
import com.lotus.game.service.HeroPortraitService;
import com.lotus.game.service.StorageService;
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
@RequestMapping("/api/admin/heroes")
@RequiredArgsConstructor
@ConditionalOnBean(StorageService.class)
public class AdminHeroPortraitController {

    private final StorageService storageService;
    private final HeroCatalog heroCatalog;
    private final HeroPortraitService heroPortraitService;

    @PostMapping(value = "/{heroId}/portrait", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> uploadPortrait(
            @PathVariable String heroId,
            @RequestParam("image") MultipartFile file,
            @AuthenticationPrincipal GameUserDetails user) {
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        heroCatalog.requireValid(heroId);
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Файл не прикреплён"));
        }
        try {
            String trimmed = heroId.trim();
            heroPortraitService.findStoredUrl(trimmed).ifPresent(storageService::deleteByUrl);
            String contentType = file.getContentType() != null ? file.getContentType() : "image/png";
            String name = file.getOriginalFilename() != null ? file.getOriginalFilename() : "portrait.png";
            String url = storageService.uploadHeroPortrait(file.getBytes(), contentType, name);
            heroPortraitService.savePortraitUrl(trimmed, url);
            return ResponseEntity.ok(Map.of("portraitUrl", url));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Ошибка загрузки: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{heroId}/portrait")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deletePortrait(
            @PathVariable String heroId,
            @AuthenticationPrincipal GameUserDetails user) {
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        try {
            heroCatalog.requireValid(heroId);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
        String trimmed = heroId.trim();
        heroPortraitService.findStoredUrl(trimmed).ifPresent(url -> {
            try {
                storageService.deleteByUrl(url);
            } catch (Exception ignored) {
                // очищаем БД в любом случае
            }
        });
        heroPortraitService.deleteByHeroId(trimmed);
        return ResponseEntity.ok(Map.of("portraitUrl", ""));
    }
}
