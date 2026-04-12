package com.lotus.game.service;

import com.lotus.game.dto.game.HeroDto;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class HeroCatalog {

    public static final String DEFAULT_HERO_ID = "lotus_guardian";

    private final List<HeroDto> ordered;
    private final Map<String, HeroDto> byId;

    public HeroCatalog() {
        ordered = List.of(
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
        this.byId = ordered.stream().collect(Collectors.toMap(HeroDto::getId, Function.identity()));
    }

    public List<HeroDto> listAll() {
        return ordered;
    }

    public Optional<HeroDto> find(String id) {
        if (id == null || id.isBlank()) return Optional.empty();
        return Optional.ofNullable(byId.get(id.trim()));
    }

    public HeroDto requireValid(String id) {
        return find(id).orElseThrow(() -> new IllegalArgumentException("Неизвестный герой: " + id));
    }

    /** Для старых матчей без heroId в БД */
    public HeroDto resolveForMatch(String heroId) {
        return find(heroId).orElseGet(() -> byId.get(DEFAULT_HERO_ID));
    }
}
