package com.lotus.game.controller;

import com.lotus.game.dto.game.CreateHeroRequest;
import com.lotus.game.dto.game.HeroDto;
import com.lotus.game.service.HeroCatalog;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/heroes")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminHeroController {

    private final HeroCatalog heroCatalog;

    @PostMapping
    public ResponseEntity<HeroDto> createHero(@Valid @RequestBody CreateHeroRequest request) {
        return ResponseEntity.ok(heroCatalog.createHero(request));
    }
}
