package com.lotus.game.config;

import com.lotus.game.entity.Minion;
import com.lotus.game.entity.Spell;
import com.lotus.game.repository.MinionRepository;
import com.lotus.game.repository.SpellRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class CardDataInitializer {

    private final MinionRepository minionRepository;
    private final SpellRepository spellRepository;

    @EventListener(ApplicationReadyEvent.class)
    public void initCards() {
        if (minionRepository.count() > 0 && spellRepository.count() > 0) return;

        if (minionRepository.count() == 0) {
            List<Minion> minions = List.of(
                    Minion.builder().name("Мурлок-разведчик").manaCost(1).attack(1).health(1).description("Слабый мурлок").build(),
                    Minion.builder().name("Волк").manaCost(2).attack(2).health(2).description("Обычный волк").build(),
                    Minion.builder().name("Огр").manaCost(3).attack(4).health(4).description("Случайно промахивается").build(),
                    Minion.builder().name("Дракон").manaCost(5).attack(5).health(5).description("Мощный дракон").build(),
                    Minion.builder().name("Гигант").manaCost(6).attack(6).health(6).description("Страшный гигант").build(),
                    Minion.builder().name("Волк-альфа").manaCost(2).attack(2).health(2).description("Вожак стаи").build(),
                    Minion.builder().name("Рыжий").manaCost(1).attack(1).health(1).description("Слабый мурлок").build(),
                    Minion.builder().name("Скелет").manaCost(1).attack(1).health(1).description("Восстаёт").build()
            );
            minionRepository.saveAll(minions);
            log.info("Initialized {} minions", minions.size());
        }

        if (spellRepository.count() == 0) {
            List<Spell> spells = List.of(
                    Spell.builder().name("Огненный шар").manaCost(4).description("Наносит 6 урона").build(),
                    Spell.builder().name("Молния").manaCost(1).description("Наносит 6 урона").build()
            );
            spellRepository.saveAll(spells);
            log.info("Initialized {} spells", spells.size());
        }
    }
}
