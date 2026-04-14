package com.lotus.game.controller;

import com.lotus.game.dto.shop.RandomCardPurchaseDto;
import com.lotus.game.dto.shop.RandomHeroPurchaseDto;
import com.lotus.game.dto.shop.ShopStatusDto;
import com.lotus.game.security.GameUserDetails;
import com.lotus.game.service.ShopService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/shop")
@RequiredArgsConstructor
public class ShopController {

    private final ShopService shopService;

    @GetMapping("/status")
    public ResponseEntity<ShopStatusDto> status(@AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(shopService.getStatus(user.getId()));
    }

    @PostMapping("/buy/random-card")
    public ResponseEntity<RandomCardPurchaseDto> buyRandomCard(@AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(shopService.buyRandomCard(user.getId()));
    }

    @PostMapping("/buy/random-hero")
    public ResponseEntity<RandomHeroPurchaseDto> buyRandomHero(@AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(shopService.buyRandomHero(user.getId()));
    }
}
