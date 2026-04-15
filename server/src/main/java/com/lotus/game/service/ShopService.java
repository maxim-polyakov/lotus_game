package com.lotus.game.service;

import com.lotus.game.dto.game.CardDto;
import com.lotus.game.dto.game.HeroDto;
import com.lotus.game.dto.shop.RandomCardPurchaseDto;
import com.lotus.game.dto.shop.RandomHeroPurchaseDto;
import com.lotus.game.dto.shop.SpecificCardPurchaseDto;
import com.lotus.game.dto.shop.SpecificCardPurchaseRequestDto;
import com.lotus.game.dto.shop.ShopStatusDto;
import com.lotus.game.entity.User;
import com.lotus.game.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class ShopService {

    public static final int RANDOM_HERO_PRICE = 300;

    private final UserRepository userRepository;
    private final CardProgressService cardProgressService;
    private final HeroProgressService heroProgressService;
    private final HeroCatalog heroCatalog;
    private final HeroPortraitService heroPortraitService;
    private final GameConfigService gameConfigService;
    private final CardService cardService;

    @Transactional
    public ShopStatusDto getStatus(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
        int randomCardPrice = gameConfigService.getRandomCardPrice();
        int specificCardDustPrice = gameConfigService.getSpecificCardDustPrice();
        cardProgressService.ensureStarterCards(user);
        heroProgressService.ensureStarterHero(user);
        userRepository.save(user);
        return ShopStatusDto.builder()
                .gold(user.getGold())
                .dust(user.getDust())
                .randomCardPrice(randomCardPrice)
                .specificCardDustPrice(specificCardDustPrice)
                .randomHeroPrice(RANDOM_HERO_PRICE)
                .lockedCardsCount(cardProgressService.countLockedCards(user))
                .lockedHeroesCount(lockedHeroIds(user).size())
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

    @Transactional
    public RandomHeroPurchaseDto buyRandomHero(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));

        heroProgressService.ensureStarterHero(user);
        List<String> locked = lockedHeroIds(user);
        if (locked.isEmpty()) {
            throw new IllegalArgumentException("Все герои уже открыты");
        }
        if (user.getGold() < RANDOM_HERO_PRICE) {
            throw new IllegalArgumentException("Недостаточно золота для покупки героя");
        }

        String heroId = locked.get(ThreadLocalRandom.current().nextInt(locked.size()));
        LinkedHashSet<String> unlocked = new LinkedHashSet<>(user.getUnlockedHeroIds());
        unlocked.add(heroId);
        user.setUnlockedHeroIds(unlocked);
        user.setGold(user.getGold() - RANDOM_HERO_PRICE);
        userRepository.save(user);

        return RandomHeroPurchaseDto.builder()
                .gold(user.getGold())
                .randomHeroPrice(RANDOM_HERO_PRICE)
                .lockedHeroesCount(lockedHeroIds(user).size())
                .hero(toClientHero(heroId))
                .build();
    }

    @Transactional
    public SpecificCardPurchaseDto buySpecificCard(Long userId, SpecificCardPurchaseRequestDto request) {
        if (request == null || request.getCardType() == null || request.getCardId() == null) {
            throw new IllegalArgumentException("Укажите тип и ID карты");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
        int specificCardDustPrice = gameConfigService.getSpecificCardDustPrice();

        cardProgressService.ensureStarterCards(user);
        CardDto card = cardService.getCard(request.getCardType().name(), request.getCardId());
        String cardKey = CardProgressService.toCardKey(card.getCardType(), card.getId());

        LinkedHashSet<String> unlocked = new LinkedHashSet<>(
                user.getUnlockedCardKeys() != null ? user.getUnlockedCardKeys() : List.of()
        );
        if (unlocked.contains(cardKey)) {
            throw new IllegalArgumentException("Эта карта уже открыта");
        }
        if (user.getDust() < specificCardDustPrice) {
            throw new IllegalArgumentException("Недостаточно пыли для покупки");
        }

        unlocked.add(cardKey);
        user.setUnlockedCardKeys(unlocked);
        user.setDust(user.getDust() - specificCardDustPrice);
        userRepository.save(user);

        return SpecificCardPurchaseDto.builder()
                .dust(user.getDust())
                .specificCardDustPrice(specificCardDustPrice)
                .lockedCardsCount(cardProgressService.countLockedCards(user))
                .card(card)
                .build();
    }

    private List<String> lockedHeroIds(User user) {
        LinkedHashSet<String> unlocked = new LinkedHashSet<>(
                user.getUnlockedHeroIds() != null ? user.getUnlockedHeroIds() : List.of()
        );
        return heroCatalog.allHeroIds().stream()
                .filter(id -> !unlocked.contains(id))
                .toList();
    }

    private HeroDto toClientHero(String heroId) {
        HeroDto base = heroCatalog.requireValid(heroId);
        String portrait = heroPortraitService.resolvePortraitUrl(heroId);
        if (portrait == null || portrait.isBlank()) {
            portrait = base.getPortraitUrl() != null ? base.getPortraitUrl() : "";
        }
        return HeroDto.builder()
                .id(base.getId())
                .name(base.getName())
                .portraitUrl(portrait)
                .startingHealth(base.getStartingHealth())
                .title(base.getTitle())
                .unlocked(true)
                .gamesUntilUnlock(null)
                .build();
    }
}
