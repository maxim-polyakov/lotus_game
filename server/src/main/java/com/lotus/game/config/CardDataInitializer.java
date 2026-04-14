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

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class CardDataInitializer {

    private final MinionRepository minionRepository;
    private final SpellRepository spellRepository;

    @EventListener(ApplicationReadyEvent.class)
    public void initCards() {
        List<Minion> seedMinions = List.of(
                Minion.builder().name("Мурлок-разведчик").manaCost(1).attack(1).health(1).description("Слабый мурлок").build(),
                Minion.builder().name("Волк").manaCost(2).attack(2).health(2).description("Обычный волк").build(),
                Minion.builder().name("Огр").manaCost(3).attack(4).health(4).description("Случайно промахивается").build(),
                Minion.builder().name("Дракон").manaCost(5).attack(5).health(5).description("Мощный дракон").build(),
                Minion.builder().name("Гигант").manaCost(6).attack(6).health(6).description("Страшный гигант").build(),
                Minion.builder().name("Волк-альфа").manaCost(2).attack(2).health(2).description("Вожак стаи").build(),
                Minion.builder().name("Рыжий").manaCost(1).attack(1).health(1).description("Слабый мурлок").build(),
                Minion.builder().name("Скелет").manaCost(1).attack(1).health(1).description("Восстаёт").build(),
                Minion.builder().name("Стальной страж").manaCost(4).attack(3).health(6).description("Крепкий защитник").build(),
                Minion.builder().name("Лесной охотник").manaCost(3).attack(3).health(3).description("Точный выстрел").build(),
                Minion.builder().name("Пустотный клинок").manaCost(4).attack(5).health(2).description("Высокий урон, но хрупкий").build(),
                Minion.builder().name("Светлый дозорный").manaCost(5).attack(4).health(7).description("Стоит до конца").build()
        );
        List<Spell> seedSpells = List.of(
                Spell.builder().name("Огненный шар").manaCost(4).damage(6).description("Наносит 6 урона").build(),
                Spell.builder().name("Молния").manaCost(1).damage(6).description("Наносит 6 урона").build(),
                Spell.builder().name("Ледяной удар").manaCost(2).damage(3).description("Холодный магический импульс").build(),
                Spell.builder().name("Природный всплеск").manaCost(3).damage(4).description("Урон силой природы").build()
        );

        Set<String> existingMinionNames = minionRepository.findAll().stream()
                .map(Minion::getName)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        List<Minion> missingMinions = seedMinions.stream()
                .filter(m -> !existingMinionNames.contains(m.getName()))
                .toList();
        if (!missingMinions.isEmpty()) {
            minionRepository.saveAll(missingMinions);
            log.info("Added {} missing minions", missingMinions.size());
        }

        Set<String> existingSpellNames = spellRepository.findAll().stream()
                .map(Spell::getName)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        List<Spell> missingSpells = seedSpells.stream()
                .filter(s -> !existingSpellNames.contains(s.getName()))
                .toList();
        if (!missingSpells.isEmpty()) {
            spellRepository.saveAll(missingSpells);
            log.info("Added {} missing spells", missingSpells.size());
        }

        spellRepository.findAll().stream()
                .filter(s -> s.getDamage() == null)
                .forEach(s -> {
                    s.setDamage(6);
                    spellRepository.save(s);
                    log.info("Updated spell '{}' with damage=6", s.getName());
                });
    }
}
