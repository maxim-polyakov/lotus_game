package com.lotus.game.service;

import com.lotus.game.dto.game.CardDto;
import com.lotus.game.dto.game.UpdateMinionRequest;
import com.lotus.game.dto.game.UpdateSpellRequest;
import com.lotus.game.entity.Minion;
import com.lotus.game.entity.Spell;
import com.lotus.game.config.RedisCacheConfig;
import com.lotus.game.repository.MinionRepository;
import com.lotus.game.repository.SpellRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
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
    @Cacheable(value = RedisCacheConfig.CACHE_CARDS, key = "'all'")
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

    @Transactional
    @CacheEvict(value = RedisCacheConfig.CACHE_CARDS, allEntries = true)
    public CardDto updateMinion(Long id, UpdateMinionRequest req) {
        Minion m = minionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Minion not found: " + id));
        if (req.getName() != null) m.setName(req.getName());
        if (req.getManaCost() != null) m.setManaCost(req.getManaCost());
        if (req.getAttack() != null) m.setAttack(req.getAttack());
        if (req.getHealth() != null) m.setHealth(req.getHealth());
        if (req.getDescription() != null) m.setDescription(req.getDescription());
        if (req.getTaunt() != null) m.setTaunt(req.getTaunt());
        if (req.getCharge() != null) m.setCharge(req.getCharge());
        if (req.getDivineShield() != null) m.setDivineShield(req.getDivineShield());
        if (req.getBattlecryType() != null) m.setBattlecryType(req.getBattlecryType().isBlank() ? null : req.getBattlecryType());
        if (req.getBattlecryValue() != null) m.setBattlecryValue(req.getBattlecryValue());
        if (req.getBattlecryTarget() != null) m.setBattlecryTarget(req.getBattlecryTarget().isBlank() ? null : req.getBattlecryTarget());
        if (req.getBattlecrySummonCardId() != null) m.setBattlecrySummonCardId(req.getBattlecrySummonCardId());
        if (req.getDeathrattleType() != null) m.setDeathrattleType(req.getDeathrattleType().isBlank() ? null : req.getDeathrattleType());
        if (req.getDeathrattleValue() != null) m.setDeathrattleValue(req.getDeathrattleValue());
        if (req.getDeathrattleSummonCardId() != null) m.setDeathrattleSummonCardId(req.getDeathrattleSummonCardId());
        return CardDto.fromMinion(minionRepository.save(m));
    }

    @Transactional
    @CacheEvict(value = RedisCacheConfig.CACHE_CARDS, allEntries = true)
    public CardDto updateSpell(Long id, UpdateSpellRequest req) {
        Spell s = spellRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Spell not found: " + id));
        if (req.getName() != null) s.setName(req.getName());
        if (req.getManaCost() != null) s.setManaCost(req.getManaCost());
        if (req.getDescription() != null) s.setDescription(req.getDescription());
        if (req.getDamage() != null) s.setDamage(req.getDamage());
        return CardDto.fromSpell(spellRepository.save(s));
    }
}
