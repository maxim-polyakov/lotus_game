package com.lotus.game.controller;

import com.lotus.game.dto.game.NotificationDto;
import com.lotus.game.security.GameUserDetails;
import com.lotus.game.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<List<NotificationDto>> list(@AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(notificationService.listForUser(user.getId()));
    }

    @GetMapping("/post-match/latest")
    public ResponseEntity<NotificationDto> latestPostMatchReward(
            @AuthenticationPrincipal GameUserDetails user,
            @RequestParam Long matchId
    ) {
        if (user == null) return ResponseEntity.status(401).build();
        return notificationService.latestUnreadPostMatchReward(user.getId(), matchId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Void> markRead(
            @PathVariable Long id,
            @AuthenticationPrincipal GameUserDetails user
    ) {
        if (user == null) return ResponseEntity.status(401).build();
        notificationService.markRead(user.getId(), id);
        return ResponseEntity.noContent().build();
    }
}
