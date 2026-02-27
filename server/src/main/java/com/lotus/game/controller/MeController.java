package com.lotus.game.controller;

import com.lotus.game.dto.user.UpdateProfileRequest;
import com.lotus.game.entity.User;
import com.lotus.game.repository.MatchRepository;
import com.lotus.game.repository.UserRepository;
import com.lotus.game.security.GameUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
public class MeController {

    private final UserRepository userRepository;
    private final MatchRepository matchRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> me(@AuthenticationPrincipal GameUserDetails user) {
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        User dbUser = userRepository.findById(user.getId()).orElse(null);
        Map<String, Object> body = new HashMap<>();
        body.put("id", user.getId());
        body.put("username", user.getUsername());
        body.put("email", user.getEmail());
        body.put("avatarUrl", user.getAvatarUrl());
        body.put("rating", dbUser != null ? dbUser.getRating() : 1000);
        body.put("roles", user.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .collect(Collectors.toList()));
        return ResponseEntity.ok(body);
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> stats(@AuthenticationPrincipal GameUserDetails user) {
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        Long userId = user.getId();
        User dbUser = userRepository.findById(userId).orElse(null);
        int rating = dbUser != null ? dbUser.getRating() : 1000;
        String rank = RatingService.getRankName(rating);
        long wins = matchRepository.countWins(userId);
        long draws = matchRepository.countDraws(userId);
        long losses = matchRepository.countLosses(userId);
        Map<String, Object> stats = new HashMap<>();
        stats.put("wins", wins);
        stats.put("losses", losses);
        stats.put("draws", draws);
        stats.put("totalMatches", wins + draws + losses);
        stats.put("rating", rating);
        stats.put("rank", rank);
        return ResponseEntity.ok(stats);
    }

    @PutMapping
    public ResponseEntity<Map<String, Object>> updateProfile(
            @AuthenticationPrincipal GameUserDetails userDetails,
            @Valid @RequestBody UpdateProfileRequest req) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        User user = userRepository.findById(userDetails.getId()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).build();
        }
        if (req.getUsername() != null && !req.getUsername().isBlank()) {
            if (!req.getUsername().equals(user.getUsername()) && userRepository.existsByUsername(req.getUsername())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Username already taken"));
            }
            user.setUsername(req.getUsername().trim());
        }
        if (req.getAvatarUrl() != null) {
            user.setAvatarUrl(req.getAvatarUrl().isBlank() ? null : req.getAvatarUrl().trim());
        }
        userRepository.save(user);

        Map<String, Object> body = new HashMap<>();
        body.put("id", user.getId());
        body.put("username", user.getUsername());
        body.put("email", user.getEmail());
        body.put("avatarUrl", user.getAvatarUrl());
        body.put("roles", user.getRoles().stream().toList());
        return ResponseEntity.ok(body);
    }
}
