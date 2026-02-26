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

    @DeleteMapping("/minions/{id}/image")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deleteMinionImage(
            @PathVariable Long id,
            @AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        Minion minion = minionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Minion not found: " + id));
        String oldUrl = minion.getImageUrl();
        if (oldUrl != null) {
            try {
                storageService.deleteByUrl(oldUrl);
            } catch (Exception e) {
                // Логируем, но продолжаем — очищаем ссылку в БД в любом случае
            }
            minion.setImageUrl(null);
            minionRepository.save(minion);
        }
        return ResponseEntity.ok(Map.of("imageUrl", ""));
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

    @DeleteMapping("/spells/{id}/image")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deleteSpellImage(
            @PathVariable Long id,
            @AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        Spell spell = spellRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Spell not found: " + id));
        String oldUrl = spell.getImageUrl();
        if (oldUrl != null) {
            try {
                storageService.deleteByUrl(oldUrl);
            } catch (Exception e) {
                // Логируем, но продолжаем — очищаем ссылку в БД в любом случае
            }
            spell.setImageUrl(null);
            spellRepository.save(spell);
        }
        return ResponseEntity.ok(Map.of("imageUrl", ""));
    }

    @PostMapping(value = "/minions/{id}/sound", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> uploadMinionSound(
            @PathVariable Long id,
            @RequestParam("sound") MultipartFile file,
            @AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Файл не прикреплён"));
        }
        Minion minion = minionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Minion not found: " + id));
        try {
            String contentType = file.getContentType() != null ? file.getContentType() : "audio/mpeg";
            String url = storageService.uploadCardSound(file.getBytes(), contentType, file.getOriginalFilename() != null ? file.getOriginalFilename() : "sound.mp3");
            minion.setSoundUrl(url);
            minionRepository.save(minion);
            return ResponseEntity.ok(Map.of("soundUrl", url));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Ошибка загрузки: " + e.getMessage()));
        }
    }

    @DeleteMapping("/minions/{id}/sound")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deleteMinionSound(
            @PathVariable Long id,
            @AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        Minion minion = minionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Minion not found: " + id));
        String oldUrl = minion.getSoundUrl();
        if (oldUrl != null) {
            try {
                storageService.deleteByUrl(oldUrl);
            } catch (Exception e) {
                // Логируем, но продолжаем
            }
            minion.setSoundUrl(null);
            minionRepository.save(minion);
        }
        return ResponseEntity.ok(Map.of("soundUrl", ""));
    }

    @PostMapping(value = "/minions/{id}/attack-sound", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> uploadMinionAttackSound(
            @PathVariable Long id,
            @RequestParam("sound") MultipartFile file,
            @AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Файл не прикреплён"));
        }
        Minion minion = minionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Minion not found: " + id));
        try {
            String contentType = file.getContentType() != null ? file.getContentType() : "audio/mpeg";
            String url = storageService.uploadCardSound(file.getBytes(), contentType, file.getOriginalFilename() != null ? file.getOriginalFilename() : "attack.mp3");
            minion.setAttackSoundUrl(url);
            minionRepository.save(minion);
            return ResponseEntity.ok(Map.of("attackSoundUrl", url));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Ошибка загрузки: " + e.getMessage()));
        }
    }

    @DeleteMapping("/minions/{id}/attack-sound")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deleteMinionAttackSound(
            @PathVariable Long id,
            @AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        Minion minion = minionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Minion not found: " + id));
        String oldUrl = minion.getAttackSoundUrl();
        if (oldUrl != null) {
            try {
                storageService.deleteByUrl(oldUrl);
            } catch (Exception e) {
                // Логируем, но продолжаем
            }
            minion.setAttackSoundUrl(null);
            minionRepository.save(minion);
        }
        return ResponseEntity.ok(Map.of("attackSoundUrl", ""));
    }

    @PostMapping(value = "/spells/{id}/sound", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> uploadSpellSound(
            @PathVariable Long id,
            @RequestParam("sound") MultipartFile file,
            @AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Файл не прикреплён"));
        }
        Spell spell = spellRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Spell not found: " + id));
        try {
            String contentType = file.getContentType() != null ? file.getContentType() : "audio/mpeg";
            String url = storageService.uploadCardSound(file.getBytes(), contentType, file.getOriginalFilename() != null ? file.getOriginalFilename() : "sound.mp3");
            spell.setSoundUrl(url);
            spellRepository.save(spell);
            return ResponseEntity.ok(Map.of("soundUrl", url));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Ошибка загрузки: " + e.getMessage()));
        }
    }

    @DeleteMapping("/spells/{id}/sound")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deleteSpellSound(
            @PathVariable Long id,
            @AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        Spell spell = spellRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Spell not found: " + id));
        String oldUrl = spell.getSoundUrl();
        if (oldUrl != null) {
            try {
                storageService.deleteByUrl(oldUrl);
            } catch (Exception e) {
                // Логируем, но продолжаем
            }
            spell.setSoundUrl(null);
            spellRepository.save(spell);
        }
        return ResponseEntity.ok(Map.of("soundUrl", ""));
    }

    @PostMapping(value = "/minions/{id}/play-effect", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> uploadMinionPlayEffect(
            @PathVariable Long id,
            @RequestParam("effect") MultipartFile file,
            @AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Файл не прикреплён"));
        }
        Minion minion = minionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Minion not found: " + id));
        try {
            String contentType = file.getContentType() != null ? file.getContentType() : "image/gif";
            String url = storageService.uploadCardEffect(file.getBytes(), contentType, file.getOriginalFilename() != null ? file.getOriginalFilename() : "effect.gif");
            minion.setPlayEffectUrl(url);
            minionRepository.save(minion);
            return ResponseEntity.ok(Map.of("playEffectUrl", url));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Ошибка загрузки: " + e.getMessage()));
        }
    }

    @DeleteMapping("/minions/{id}/play-effect")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deleteMinionPlayEffect(
            @PathVariable Long id,
            @AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        Minion minion = minionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Minion not found: " + id));
        String oldUrl = minion.getPlayEffectUrl();
        if (oldUrl != null) {
            try {
                storageService.deleteByUrl(oldUrl);
            } catch (Exception e) {
                // Логируем, но продолжаем
            }
            minion.setPlayEffectUrl(null);
            minionRepository.save(minion);
        }
        return ResponseEntity.ok(Map.of("playEffectUrl", ""));
    }

    @PostMapping(value = "/minions/{id}/attack-effect", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> uploadMinionAttackEffect(
            @PathVariable Long id,
            @RequestParam("effect") MultipartFile file,
            @AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Файл не прикреплён"));
        }
        Minion minion = minionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Minion not found: " + id));
        try {
            String contentType = file.getContentType() != null ? file.getContentType() : "image/gif";
            String url = storageService.uploadCardEffect(file.getBytes(), contentType, file.getOriginalFilename() != null ? file.getOriginalFilename() : "effect.gif");
            minion.setAttackEffectUrl(url);
            minionRepository.save(minion);
            return ResponseEntity.ok(Map.of("attackEffectUrl", url));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Ошибка загрузки: " + e.getMessage()));
        }
    }

    @DeleteMapping("/minions/{id}/attack-effect")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deleteMinionAttackEffect(
            @PathVariable Long id,
            @AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        Minion minion = minionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Minion not found: " + id));
        String oldUrl = minion.getAttackEffectUrl();
        if (oldUrl != null) {
            try {
                storageService.deleteByUrl(oldUrl);
            } catch (Exception e) {
                // Логируем, но продолжаем
            }
            minion.setAttackEffectUrl(null);
            minionRepository.save(minion);
        }
        return ResponseEntity.ok(Map.of("attackEffectUrl", ""));
    }

    @PostMapping(value = "/spells/{id}/play-effect", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> uploadSpellPlayEffect(
            @PathVariable Long id,
            @RequestParam("effect") MultipartFile file,
            @AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Файл не прикреплён"));
        }
        Spell spell = spellRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Spell not found: " + id));
        try {
            String contentType = file.getContentType() != null ? file.getContentType() : "image/gif";
            String url = storageService.uploadCardEffect(file.getBytes(), contentType, file.getOriginalFilename() != null ? file.getOriginalFilename() : "effect.gif");
            spell.setPlayEffectUrl(url);
            spellRepository.save(spell);
            return ResponseEntity.ok(Map.of("playEffectUrl", url));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Ошибка загрузки: " + e.getMessage()));
        }
    }

    @DeleteMapping("/spells/{id}/play-effect")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deleteSpellPlayEffect(
            @PathVariable Long id,
            @AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        Spell spell = spellRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Spell not found: " + id));
        String oldUrl = spell.getPlayEffectUrl();
        if (oldUrl != null) {
            try {
                storageService.deleteByUrl(oldUrl);
            } catch (Exception e) {
                // Логируем, но продолжаем
            }
            spell.setPlayEffectUrl(null);
            spellRepository.save(spell);
        }
        return ResponseEntity.ok(Map.of("playEffectUrl", ""));
    }
}
