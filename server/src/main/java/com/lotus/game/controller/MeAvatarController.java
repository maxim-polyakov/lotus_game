package com.lotus.game.controller;

import com.lotus.game.entity.User;
import com.lotus.game.repository.UserRepository;
import com.lotus.game.service.StorageService;
import com.lotus.game.security.GameUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
@ConditionalOnBean(StorageService.class)
public class MeAvatarController {

    private final UserRepository userRepository;
    private final StorageService storageService;

    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> uploadAvatar(
            @RequestParam("avatar") MultipartFile file,
            @AuthenticationPrincipal GameUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Файл не прикреплён"));
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Допустимы только изображения (PNG, JPG, GIF, WebP)"));
        }
        User user = userRepository.findById(userDetails.getId()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).build();
        }
        try {
            String url = storageService.uploadAvatar(
                    file.getBytes(),
                    contentType,
                    file.getOriginalFilename() != null ? file.getOriginalFilename() : "avatar.png");
            user.setAvatarUrl(url);
            userRepository.save(user);

            Map<String, Object> body = new HashMap<>();
            body.put("id", user.getId());
            body.put("username", user.getUsername());
            body.put("email", user.getEmail());
            body.put("avatarUrl", user.getAvatarUrl());
            body.put("roles", user.getRoles().stream().toList());
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Ошибка загрузки: " + e.getMessage()));
        }
    }
}
