package com.lotus.game.controller;

import com.lotus.game.repository.UserRepository;
import com.lotus.game.service.RatingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/leaderboard")
@RequiredArgsConstructor
public class LeaderboardController {

    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getLeaderboard() {
        List<Map<String, Object>> list = userRepository.findTop10ByOrderByRatingDesc().stream()
                .map(u -> Map.<String, Object>of(
                        "username", u.getUsername(),
                        "rating", u.getRating(),
                        "rank", RatingService.getRankName(u.getRating())
                ))
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }
}
