package com.lotus.game.service;

import com.lotus.game.dto.game.CardDto;
import com.lotus.game.dto.shop.RandomCardPurchaseDto;
import com.lotus.game.dto.shop.ShopStatusDto;
import com.lotus.game.entity.User;
import com.lotus.game.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ShopService {

    private final UserRepository userRepository;
    private final CardProgressService cardProgressService;
    private final GameConfigService gameConfigService;

    @Transactional
    public ShopStatusDto getStatus(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
        int randomCardPrice = gameConfigService.getRandomCardPrice();
        cardProgressService.ensureStarterCards(user);
        userRepository.save(user);
        return ShopStatusDto.builder()
                .gold(user.getGold())
                .randomCardPrice(randomCardPrice)
                .lockedCardsCount(cardProgressService.countLockedCards(user))
                .build();
    }

    @Transactional
    public RandomCardPurchaseDto buyRandomCard(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
        int randomCardPrice = gameConfigService.getRandomCardPrice();

        cardProgressService.ensureStarterCards(user);
        if (cardProgressService.countLockedCards(user) <= 0) {
            throw new IllegalArgumentException("Все карты уже открыты");
        }
        if (user.getGold() < randomCardPrice) {
            throw new IllegalArgumentException("Недостаточно золота для покупки");
        }

        CardDto card = cardProgressService.unlockRandomCard(user);
        if (card == null) {
            throw new IllegalArgumentException("Все карты уже открыты");
        }

        user.setGold(user.getGold() - randomCardPrice);
        userRepository.save(user);

        return RandomCardPurchaseDto.builder()
                .gold(user.getGold())
                .randomCardPrice(randomCardPrice)
                .lockedCardsCount(cardProgressService.countLockedCards(user))
                .card(card)
                .build();
    }
}
