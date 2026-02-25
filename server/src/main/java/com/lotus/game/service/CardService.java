package com.lotus.game.service;

import com.lotus.game.dto.game.CardDto;
import com.lotus.game.entity.Minion;
import com.lotus.game.entity.Spell;
import com.lotus.game.repository.MinionRepository;
import com.lotus.game.repository.SpellRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class CardService {

    private final MinionRepository minionRepository;
    private final SpellRepository spellRepository;

    @Transactional(readOnly = true)
    public List<CardDto> getAllCards() {
        List<CardDto> result = new ArrayList<>();
        minionRepository.findAllByOrderByManaCostAscNameAsc().stream()
                .map(CardDto::fromMinion)
                .forEach(result::add);
        spellRepository.findAllByOrderByManaCostAscNameAsc().stream()
                .map(CardDto::fromSpell)
                .forEach(result::add);
        result.sort(Comparator.comparing(CardDto::getManaCost).thenComparing(CardDto::getName));
        return result;
    }

    @Transactional(readOnly = true)
    public CardDto getCard(String cardType, Long id) {
        if ("MINION".equalsIgnoreCase(cardType)) {
            Minion m = minionRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Minion not found: " + id));
            return CardDto.fromMinion(m);
        }
        if ("SPELL".equalsIgnoreCase(cardType)) {
            Spell s = spellRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Spell not found: " + id));
            return CardDto.fromSpell(s);
        }
        throw new IllegalArgumentException("Unknown card type: " + cardType);
    }
}
