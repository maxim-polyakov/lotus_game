package com.lotus.game.controller;

import com.lotus.game.dto.game.*;
import com.lotus.game.entity.Match;
import com.lotus.game.security.GameUserDetails;
import com.lotus.game.service.MatchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/matches")
@RequiredArgsConstructor
public class MatchController {

    private final MatchService matchService;

    @PostMapping("/find")
    public ResponseEntity<MatchDto> findOrCreateMatch(@RequestParam Long deckId,
                                                       @RequestParam(defaultValue = "RANKED") String mode,
                                                       @AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        Match.MatchMode matchMode = "CASUAL".equalsIgnoreCase(mode) ? Match.MatchMode.CASUAL : Match.MatchMode.RANKED;
        return ResponseEntity.ok(matchService.findOrCreateMatch(user.getId(), deckId, matchMode));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MatchDto> getMatch(@PathVariable Long id, @AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(matchService.getMatch(id, user.getId()));
    }

    @GetMapping("/{id}/replay")
    public ResponseEntity<List<ReplayStepDto>> getReplay(@PathVariable Long id, @AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(matchService.getReplay(id, user.getId()));
    }

    @GetMapping
    public ResponseEntity<List<MatchDto>> getMyMatches(@AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(matchService.getMyMatches(user.getId()));
    }

    @PostMapping("/{id}/play")
    public ResponseEntity<MatchDto> playCard(@PathVariable Long id,
                                           @Valid @RequestBody PlayCardRequest request,
                                           @AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(matchService.playCard(id, user.getId(), request));
    }

    @PostMapping("/{id}/attack")
    public ResponseEntity<MatchDto> attack(@PathVariable Long id,
                                         @Valid @RequestBody AttackRequest request,
                                         @AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(matchService.attack(id, user.getId(), request));
    }

    @PostMapping("/{id}/end-turn")
    public ResponseEntity<MatchDto> endTurn(@PathVariable Long id, @AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(matchService.endTurn(id, user.getId()));
    }
}
