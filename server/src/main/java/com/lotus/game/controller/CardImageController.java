package com.lotus.game.controller;

import com.lotus.game.entity.Minion;
import com.lotus.game.entity.Spell;
import com.lotus.game.repository.MinionRepository;
import com.lotus.game.repository.SpellRepository;
import com.lotus.game.security.GameUserDetails;
import com.lotus.game.service.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/cards")
@RequiredArgsConstructor
@ConditionalOnBean(StorageService.class)
public class CardImageController {

    private final StorageService storageService;
    private final MinionRepository minionRepository;
    private final SpellRepository spellRepository;

    @PostMapping("/minions/{id}/image")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> uploadMinionImage(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal GameUserDetails user) throws IOException {
        if (user == null) return ResponseEntity.status(401).build();
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        Minion minion = minionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Minion not found: " + id));
        String url = storageService.uploadCardImage(
                file.getInputStream(),
                file.getContentType(),
                file.getOriginalFilename());
        minion.setImageUrl(url);
        minionRepository.save(minion);
        return ResponseEntity.ok(Map.of("imageUrl", url));
    }

    @PostMapping("/spells/{id}/image")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> uploadSpellImage(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal GameUserDetails user) throws IOException {
        if (user == null) return ResponseEntity.status(401).build();
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        Spell spell = spellRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Spell not found: " + id));
        String url = storageService.uploadCardImage(
                file.getInputStream(),
                file.getContentType(),
                file.getOriginalFilename());
        spell.setImageUrl(url);
        spellRepository.save(spell);
        return ResponseEntity.ok(Map.of("imageUrl", url));
    }
}
