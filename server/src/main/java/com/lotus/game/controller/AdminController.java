package com.lotus.game.controller;

import com.lotus.game.service.AdminService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @PostMapping("/users/{userId}/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> promoteToAdmin(@PathVariable Long userId) {
        adminService.promoteToAdmin(userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/users/promote-admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> promoteToAdminByEmailOrUsername(@RequestBody PromoteAdminRequest request) {
        adminService.promoteToAdminByEmailOrUsername(request.getEmailOrUsername());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/users/grant-gold")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<GoldGrantResponse> grantGold(@RequestBody GoldGrantRequest request) {
        int amount = request != null ? request.getAmount() : 0;
        String emailOrUsername = request != null ? request.getEmailOrUsername() : null;
        var result = adminService.grantGoldToUserByEmailOrUsername(emailOrUsername, amount);
        return ResponseEntity.ok(GoldGrantResponse.builder()
                .userId(result.userId())
                .username(result.username())
                .grantedGold(result.grantedGold())
                .totalGold(result.totalGold())
                .build());
    }

    @Data
    public static class PromoteAdminRequest {
        private String emailOrUsername;
    }

    @Data
    public static class GoldGrantRequest {
        private String emailOrUsername;
        private int amount;
    }

    @Data
    @lombok.Builder
    public static class GoldGrantResponse {
        private Long userId;
        private String username;
        private int grantedGold;
        private int totalGold;
    }
}
