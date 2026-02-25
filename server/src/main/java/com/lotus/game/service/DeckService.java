package com.lotus.game.service;

import com.lotus.game.dto.game.*;
import com.lotus.game.entity.Deck;
import com.lotus.game.entity.DeckCard;
import com.lotus.game.entity.Minion;
import com.lotus.game.entity.Spell;
import com.lotus.game.repository.DeckRepository;
import com.lotus.game.repository.MinionRepository;
import com.lotus.game.repository.SpellRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DeckService {

    private static final int DECK_SIZE = 30;

    private final DeckRepository deckRepository;
    private final MinionRepository minionRepository;
    private final SpellRepository spellRepository;

    @Transactional(readOnly = true)
    public List<DeckDto> getDecksByUserId(Long userId) {
        return deckRepository.findByUserIdOrderByNameAsc(userId).stream()
                .map(DeckDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public DeckDto getDeck(Long deckId, Long userId) {
        Deck deck = deckRepository.findById(deckId)
                .orElseThrow(() -> new IllegalArgumentException("Deck not found: " + deckId));
        if (!deck.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Access denied");
        }
        return DeckDto.from(deck);
    }

    @Transactional
    public DeckDto createDeck(Long userId, CreateDeckRequest request) {
        validateDeckSize(request.getCards());
        Deck deck = new Deck();
        deck.setUserId(userId);
        deck.setName(request.getName());
        deck.setCards(new ArrayList<>());
        deck = deckRepository.save(deck);

        for (DeckCardSlotDto slot : request.getCards()) {
            DeckCard dc = new DeckCard();
            dc.setDeck(deck);
            if (slot.getCardType() == CardDto.CardType.MINION) {
                Minion m = minionRepository.findById(slot.getCardId())
                        .orElseThrow(() -> new IllegalArgumentException("Minion not found: " + slot.getCardId()));
                dc.setMinion(m);
            } else {
                Spell s = spellRepository.findById(slot.getCardId())
                        .orElseThrow(() -> new IllegalArgumentException("Spell not found: " + slot.getCardId()));
                dc.setSpell(s);
            }
            dc.setCount(slot.getCount());
            deck.getCards().add(dc);
        }
        deckRepository.save(deck);
        return DeckDto.from(deck);
    }

    @Transactional
    public DeckDto updateDeck(Long deckId, Long userId, UpdateDeckRequest request) {
        Deck deck = deckRepository.findById(deckId)
                .orElseThrow(() -> new IllegalArgumentException("Deck not found: " + deckId));
        if (!deck.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Access denied");
        }
        if (request.getName() != null) deck.setName(request.getName());
        if (request.getCards() != null) {
            validateDeckSize(request.getCards());
            deck.getCards().clear();
            for (DeckCardSlotDto slot : request.getCards()) {
                DeckCard dc = new DeckCard();
                dc.setDeck(deck);
                if (slot.getCardType() == CardDto.CardType.MINION) {
                    Minion m = minionRepository.findById(slot.getCardId())
                            .orElseThrow(() -> new IllegalArgumentException("Minion not found: " + slot.getCardId()));
                    dc.setMinion(m);
                } else {
                    Spell s = spellRepository.findById(slot.getCardId())
                            .orElseThrow(() -> new IllegalArgumentException("Spell not found: " + slot.getCardId()));
                    dc.setSpell(s);
                }
                dc.setCount(slot.getCount());
                deck.getCards().add(dc);
            }
        }
        deckRepository.save(deck);
        return DeckDto.from(deck);
    }

    @Transactional
    public void deleteDeck(Long deckId, Long userId) {
        Deck deck = deckRepository.findById(deckId)
                .orElseThrow(() -> new IllegalArgumentException("Deck not found: " + deckId));
        if (!deck.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Access denied");
        }
        deckRepository.delete(deck);
    }

    private void validateDeckSize(List<DeckCardSlotDto> cards) {
        int total = cards.stream().mapToInt(DeckCardSlotDto::getCount).sum();
        if (total != DECK_SIZE) {
            throw new IllegalArgumentException("Deck must contain exactly " + DECK_SIZE + " cards, got " + total);
        }
    }
}
