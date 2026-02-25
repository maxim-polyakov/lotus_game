package com.lotus.game.controller;

import com.lotus.game.dto.game.*;
import com.lotus.game.security.GameUserDetails;
import com.lotus.game.service.DeckService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/decks")
@RequiredArgsConstructor
public class DeckController {

    private final DeckService deckService;

    @GetMapping
    public ResponseEntity<List<DeckDto>> getMyDecks(@AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(deckService.getDecksByUserId(user.getId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DeckDto> getDeck(@PathVariable Long id, @AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(deckService.getDeck(id, user.getId()));
    }

    @PostMapping
    public ResponseEntity<DeckDto> createDeck(@Valid @RequestBody CreateDeckRequest request,
                                              @AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.status(HttpStatus.CREATED).body(deckService.createDeck(user.getId(), request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DeckDto> updateDeck(@PathVariable Long id,
                                             @Valid @RequestBody UpdateDeckRequest request,
                                             @AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(deckService.updateDeck(id, user.getId(), request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDeck(@PathVariable Long id, @AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        deckService.deleteDeck(id, user.getId());
        return ResponseEntity.noContent().build();
    }
}
