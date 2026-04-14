package com.lotus.game.service;

import com.lotus.game.dto.game.CardDto;
import com.lotus.game.entity.Deck;
import com.lotus.game.entity.DeckCard;
import com.lotus.game.entity.User;
import com.lotus.game.repository.DeckRepository;
import com.lotus.game.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CardProgressService {

    private static final int STARTER_CARD_POOL_SIZE = 12;
    private static final String ADMIN_ROLE = "ROLE_ADMIN";

    private final UserRepository userRepository;
    private final DeckRepository deckRepository;
    private final CardService cardService;
    private final GameConfigService gameConfigService;

    @Transactional
    public List<CardDto> listCardsForUser(Long userId) {
        User user = userRepository.findById(userId).orElseThrow();
        if (isAdmin(user)) {
            return cardService.getAllCards();
        }
        ensureStarterCards(user);
        userRepository.save(user);
        Set<String> unlocked = user.getUnlockedCardKeys();
        return cardService.getAllCards().stream()
                .filter(c -> unlocked.contains(toCardKey(c.getCardType(), c.getId())))
                .toList();
    }

    @Transactional
    public boolean canUseCard(Long userId, CardDto.CardType type, Long cardId) {
        User user = userRepository.findById(userId).orElseThrow();
        if (isAdmin(user)) {
            return true;
        }
        ensureStarterCards(user);
        userRepository.save(user);
        return user.getUnlockedCardKeys().contains(toCardKey(type, cardId));
    }

    public boolean hasLockedCards(User user) {
        List<String> allKeys = eligibleDropCards().stream()
                .map(c -> toCardKey(c.getCardType(), c.getId()))
                .toList();
        Set<String> unlocked = user.getUnlockedCardKeys() != null ? user.getUnlockedCardKeys() : Set.of();
        return allKeys.stream().anyMatch(k -> !unlocked.contains(k));
    }

    public CardDto unlockRandomCard(User user) {
        ensureStarterCards(user);
        Set<String> unlocked = user.getUnlockedCardKeys();
        List<CardDto> locked = eligibleDropCards().stream()
                .filter(c -> !unlocked.contains(toCardKey(c.getCardType(), c.getId())))
                .toList();
        if (locked.isEmpty()) {
            return null;
        }
        CardDto pick = locked.get(ThreadLocalRandom.current().nextInt(locked.size()));
        unlocked.add(toCardKey(pick.getCardType(), pick.getId()));
        user.setUnlockedCardKeys(unlocked);
        return pick;
    }

    void ensureStarterCards(User user) {
        if (user.getUnlockedCardKeys() == null) {
            user.setUnlockedCardKeys(new LinkedHashSet<>());
        }
        if (!user.getUnlockedCardKeys().isEmpty()) {
            return;
        }

        // Preserve compatibility for old users: cards from already created decks stay available.
        List<Deck> userDecks = deckRepository.findByUserIdOrderByNameAsc(user.getId());
        for (Deck deck : userDecks) {
            for (DeckCard dc : deck.getCards()) {
                if (dc.getMinion() != null) {
                    user.getUnlockedCardKeys().add(toCardKey(CardDto.CardType.MINION, dc.getMinion().getId()));
                } else if (dc.getSpell() != null) {
                    user.getUnlockedCardKeys().add(toCardKey(CardDto.CardType.SPELL, dc.getSpell().getId()));
                }
            }
        }

        List<String> allKeys = eligibleDropCards().stream()
                .map(c -> toCardKey(c.getCardType(), c.getId()))
                .collect(Collectors.toCollection(ArrayList::new));
        int target = Math.min(STARTER_CARD_POOL_SIZE, allKeys.size());
        while (user.getUnlockedCardKeys().size() < target && !allKeys.isEmpty()) {
            int idx = ThreadLocalRandom.current().nextInt(allKeys.size());
            user.getUnlockedCardKeys().add(allKeys.remove(idx));
        }
    }

    public static String toCardKey(CardDto.CardType type, Long cardId) {
        return type.name() + ":" + cardId;
    }

    private static boolean isAdmin(User user) {
        return user.getRoles() != null && user.getRoles().contains(ADMIN_ROLE);
    }

    private List<CardDto> eligibleDropCards() {
        List<CardDto> all = cardService.getAllCards();
        Set<String> enabled = gameConfigService.getEnabledPostMatchCardKeys();
        if (enabled.isEmpty()) {
            return all;
        }
        List<CardDto> filtered = all.stream()
                .filter(c -> enabled.contains(toCardKey(c.getCardType(), c.getId())))
                .toList();
        return filtered.isEmpty() ? all : filtered;
    }
}
