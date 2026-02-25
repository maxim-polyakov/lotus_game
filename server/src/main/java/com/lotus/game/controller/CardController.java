package com.lotus.game.controller;

import com.lotus.game.dto.game.CardDto;
import com.lotus.game.service.CardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cards")
@RequiredArgsConstructor
public class CardController {

    private final CardService cardService;

    @GetMapping
    public ResponseEntity<List<CardDto>> getAllCards() {
        return ResponseEntity.ok(cardService.getAllCards());
    }

    @GetMapping("/{type}/{id}")
    public ResponseEntity<CardDto> getCard(@PathVariable String type, @PathVariable Long id) {
        return ResponseEntity.ok(cardService.getCard(type, id));
    }
}
