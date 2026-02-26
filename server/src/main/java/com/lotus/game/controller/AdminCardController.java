package com.lotus.game.controller;

import com.lotus.game.dto.game.CardDto;
import com.lotus.game.dto.game.UpdateMinionRequest;
import com.lotus.game.dto.game.UpdateSpellRequest;
import com.lotus.game.service.CardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/cards")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminCardController {

    private final CardService cardService;

    @PutMapping("/minions/{id}")
    public ResponseEntity<CardDto> updateMinion(
            @PathVariable Long id,
            @Valid @RequestBody UpdateMinionRequest request) {
        return ResponseEntity.ok(cardService.updateMinion(id, request));
    }

    @PutMapping("/spells/{id}")
    public ResponseEntity<CardDto> updateSpell(
            @PathVariable Long id,
            @Valid @RequestBody UpdateSpellRequest request) {
        return ResponseEntity.ok(cardService.updateSpell(id, request));
    }
}
