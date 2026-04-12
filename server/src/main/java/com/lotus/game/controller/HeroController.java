package com.lotus.game.controller;

import com.lotus.game.dto.game.HeroDto;
import com.lotus.game.service.HeroCatalog;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/heroes")
@RequiredArgsConstructor
public class HeroController {

    private final HeroCatalog heroCatalog;

    @GetMapping
    public ResponseEntity<List<HeroDto>> list() {
        return ResponseEntity.ok(heroCatalog.listAll());
    }
}
