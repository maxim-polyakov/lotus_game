package com.lotus.game.controller;

import com.lotus.game.entity.Minion;
import com.lotus.game.entity.Spell;
import com.lotus.game.repository.MinionRepository;
import com.lotus.game.repository.SpellRepository;
import com.lotus.game.security.GameUserDetails;
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
@RequestMapping("/api/cards")
@RequiredArgsConstructor
@ConditionalOnBean(StorageService.class)
public class CardImageController {

    private final StorageService storageService;
    private final MinionRepository minionRepository;
    private final SpellRepository spellRepository;

    @PostMapping(value = "/minions/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> uploadMinionImage(
            @PathVariable Long id,
            @RequestParam("image") MultipartFile file,
            @AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Файл не прикреплён"));
        }
        Minion minion = minionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Minion not found: " + id));
        try {
            String contentType = file.getContentType() != null ? file.getContentType() : "image/png";
            String url = storageService.uploadCardImage(file.getBytes(), contentType, "image.png");
            minion.setImageUrl(url);
            minionRepository.save(minion);
            return ResponseEntity.ok(Map.of("imageUrl", url));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Ошибка загрузки: " + e.getMessage()));
        }
    }

    @PostMapping(value = "/spells/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> uploadSpellImage(
            @PathVariable Long id,
            @RequestParam("image") MultipartFile file,
            @AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Файл не прикреплён"));
        }
        Spell spell = spellRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Spell not found: " + id));
        try {
            String contentType = file.getContentType() != null ? file.getContentType() : "image/png";
            String url = storageService.uploadCardImage(file.getBytes(), contentType, "image.png");
            spell.setImageUrl(url);
            spellRepository.save(spell);
            return ResponseEntity.ok(Map.of("imageUrl", url));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Ошибка загрузки: " + e.getMessage()));
        }
    }
}
