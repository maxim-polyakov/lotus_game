package com.lotus.game.service;

import com.lotus.game.dto.game.CreateHeroRequest;
import com.lotus.game.dto.game.HeroDto;
import com.lotus.game.entity.GameHero;
import com.lotus.game.repository.GameHeroRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class HeroCatalog {

    public static final String DEFAULT_HERO_ID = "lotus_guardian";

    private final GameHeroRepository gameHeroRepository;

    private static final List<HeroDto> DEFAULT_HEROES = List.of(
            HeroDto.builder().id("lotus_guardian").name("Страж лотоса").title("Баланс и выносливость")
                    .portraitUrl("").startingHealth(30).build(),
            HeroDto.builder().id("ember_mage").name("Пепельный маг").title("Хрупкий, но сильный удар")
                    .portraitUrl("").startingHealth(28).build(),
            HeroDto.builder().id("thorn_ranger").name("Лучник шипов").title("Ни шагу назад")
                    .portraitUrl("").startingHealth(30).build(),
            HeroDto.builder().id("tide_shaman").name("Шаман прилива").title("Много моря — много жизни")
                    .portraitUrl("").startingHealth(32).build(),
            HeroDto.builder().id("void_rogue").name("Разбойник пустоты").title("Быстрый и жёсткий")
                    .portraitUrl("").startingHealth(29).build(),
            HeroDto.builder().id("sun_paladin").name("Паладин солнца").title("Свет и дисциплина")
                    .portraitUrl("").startingHealth(31).build()
    );

    public List<HeroDto> listAll() {
        LinkedHashMap<String, HeroDto> merged = new LinkedHashMap<>();
        DEFAULT_HEROES.forEach(h -> merged.put(h.getId(), h));
        gameHeroRepository.findAllByOrderByNameAscIdAsc().forEach(h -> merged.put(h.getId(), toDto(h)));
        return new ArrayList<>(merged.values());
    }

    public List<String> allHeroIds() {
        return listAll().stream().map(HeroDto::getId).toList();
    }

    public int heroCount() {
        return listAll().size();
    }

    public Optional<HeroDto> find(String id) {
        if (id == null || id.isBlank()) return Optional.empty();
        String normalized = id.trim();
        return listAll().stream().filter(h -> h.getId().equals(normalized)).findFirst();
    }

    public HeroDto requireValid(String id) {
        return find(id).orElseThrow(() -> new IllegalArgumentException("Неизвестный герой: " + id));
    }

    /** Для старых матчей без heroId в БД */
    public HeroDto resolveForMatch(String heroId) {
        return find(heroId).orElseGet(() -> find(DEFAULT_HERO_ID).orElse(DEFAULT_HEROES.get(0)));
    }

    @Transactional
    public HeroDto createHero(CreateHeroRequest req) {
        if (req == null) {
            throw new IllegalArgumentException("Пустые данные героя");
        }
        String id = req.getId() == null ? "" : req.getId().trim();
        if (id.isBlank()) {
            throw new IllegalArgumentException("Укажите ID героя");
        }
        if (find(id).isPresent()) {
            throw new IllegalArgumentException("Герой с таким ID уже существует");
        }
        int hp = req.getStartingHealth() == null ? 30 : req.getStartingHealth();
        GameHero saved = gameHeroRepository.save(GameHero.builder()
                .id(id)
                .name(req.getName().trim())
                .title(req.getTitle() != null ? req.getTitle().trim() : "")
                .startingHealth(hp)
                .portraitUrl("")
                .build());
        return toDto(saved);
    }

    private static HeroDto toDto(GameHero hero) {
        return HeroDto.builder()
                .id(hero.getId())
                .name(hero.getName())
                .title(hero.getTitle())
                .startingHealth(hero.getStartingHealth() != null ? hero.getStartingHealth() : 30)
                .portraitUrl(hero.getPortraitUrl() != null ? hero.getPortraitUrl() : "")
                .build();
    }
}
