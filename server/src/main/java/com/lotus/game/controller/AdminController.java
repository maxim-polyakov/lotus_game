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

    @Data
    public static class PromoteAdminRequest {
        private String emailOrUsername;
    }
}
