package com.lotus.game.controller;

import com.lotus.game.dto.game.HeroDto;
import com.lotus.game.security.GameUserDetails;
import com.lotus.game.service.HeroProgressService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/heroes")
@RequiredArgsConstructor
public class HeroController {

    private final HeroProgressService heroProgressService;

    @GetMapping
    public ResponseEntity<List<HeroDto>> list(@AuthenticationPrincipal GameUserDetails user) {
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(heroProgressService.listHeroesForUser(user.getId()));
    }
}
