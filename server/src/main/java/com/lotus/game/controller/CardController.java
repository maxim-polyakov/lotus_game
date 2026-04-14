package com.lotus.game.controller;

import com.lotus.game.dto.game.CardDto;
import com.lotus.game.security.GameUserDetails;
import com.lotus.game.service.CardService;
import com.lotus.game.service.CardProgressService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cards")
@RequiredArgsConstructor
public class CardController {

    private final CardService cardService;
    private final CardProgressService cardProgressService;

    @GetMapping
    public ResponseEntity<List<CardDto>> getAllCards() {
        return ResponseEntity.ok(cardService.getAllCards());
    }

    @GetMapping("/collection")
    public ResponseEntity<List<CardDto>> getCollectionCards(@AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(cardProgressService.listCardsForUser(user.getId()));
    }

    @GetMapping("/{type}/{id}")
    public ResponseEntity<CardDto> getCard(@PathVariable String type, @PathVariable Long id) {
        return ResponseEntity.ok(cardService.getCard(type, id));
    }
}
