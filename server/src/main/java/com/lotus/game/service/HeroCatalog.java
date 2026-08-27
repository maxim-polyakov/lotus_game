package com.lotus.game.service;

import com.lotus.game.dto.game.CreateHeroRequest;
import com.lotus.game.dto.game.UpdateHeroRequest;
import com.lotus.game.dto.game.HeroDto;
import com.lotus.game.entity.GameHero;
import com.lotus.game.repository.GameHeroRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
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
        String name = req.getName() == null ? "" : req.getName().trim();
        if (name.isBlank()) {
            throw new IllegalArgumentException("Укажите имя героя");
        }

        String id = req.getId() == null ? "" : req.getId().trim().toLowerCase();
        if (id.isBlank()) {
            id = generateUniqueHeroId(name);
        } else if (find(id).isPresent()) {
            throw new IllegalArgumentException("Герой с таким ID уже существует");
        }

        int hp = req.getStartingHealth() == null ? 30 : req.getStartingHealth();
        GameHero saved = gameHeroRepository.save(GameHero.builder()
                .id(id)
                .name(name)
                .title(req.getTitle() != null ? req.getTitle().trim() : "")
                .startingHealth(hp)
                .portraitUrl("")
                .build());
        return toDto(saved);
    }

    @Transactional
    public HeroDto updateHero(String heroId, UpdateHeroRequest req) {
        if (req == null) {
            throw new IllegalArgumentException("Пустые данные героя");
        }
        HeroDto existing = requireValid(heroId);
        String id = existing.getId();

        GameHero hero = gameHeroRepository.findById(id).orElse(null);
        if (hero == null) {
            // Переопределяем встроенного героя строкой в БД.
            hero = GameHero.builder()
                    .id(id)
                    .name(existing.getName())
                    .title(existing.getTitle() != null ? existing.getTitle() : "")
                    .startingHealth(existing.getStartingHealth() > 0 ? existing.getStartingHealth() : 30)
                    .portraitUrl(existing.getPortraitUrl() != null ? existing.getPortraitUrl() : "")
                    .build();
        }

        if (req.getName() != null) {
            String name = req.getName().trim();
            if (name.isBlank()) {
                throw new IllegalArgumentException("Укажите имя героя");
            }
            if (name.length() < 2) {
                throw new IllegalArgumentException("Имя героя слишком короткое");
            }
            hero.setName(name);
        }
        if (req.getTitle() != null) {
            hero.setTitle(req.getTitle().trim());
        }
        if (req.getStartingHealth() != null) {
            hero.setStartingHealth(req.getStartingHealth());
        }

        return toDto(gameHeroRepository.save(hero));
    }

    private String generateUniqueHeroId(String name) {
        String base = slugifyHeroId(name);
        String candidate = base;
        int suffix = 2;
        while (find(candidate).isPresent()) {
            candidate = base + "_" + suffix;
            suffix++;
            if (suffix > 9999) {
                candidate = "hero_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 10);
                break;
            }
        }
        return candidate;
    }

    static String slugifyHeroId(String name) {
        if (name == null || name.isBlank()) {
            return "hero_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        }
        StringBuilder sb = new StringBuilder();
        String lower = name.trim().toLowerCase();
        for (int i = 0; i < lower.length(); i++) {
            char ch = lower.charAt(i);
            String mapped = transliterateChar(ch);
            if (mapped == null) continue;
            for (int j = 0; j < mapped.length(); j++) {
                char c = mapped.charAt(j);
                if ((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')) {
                    sb.append(c);
                } else if (c == '_' || c == '-' || c == ' ') {
                    if (sb.length() > 0 && sb.charAt(sb.length() - 1) != '_') {
                        sb.append('_');
                    }
                }
            }
        }
        while (sb.length() > 0 && sb.charAt(sb.length() - 1) == '_') {
            sb.setLength(sb.length() - 1);
        }
        String slug = sb.toString();
        if (slug.length() < 3) {
            slug = "hero_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        }
        if (slug.length() > 64) {
            slug = slug.substring(0, 64);
            while (slug.endsWith("_")) {
                slug = slug.substring(0, slug.length() - 1);
            }
        }
        return slug;
    }

    private static String transliterateChar(char ch) {
        return switch (ch) {
            case 'а' -> "a";
            case 'б' -> "b";
            case 'в' -> "v";
            case 'г' -> "g";
            case 'д' -> "d";
            case 'е', 'ё', 'э' -> "e";
            case 'ж' -> "zh";
            case 'з' -> "z";
            case 'и', 'й' -> "i";
            case 'к' -> "k";
            case 'л' -> "l";
            case 'м' -> "m";
            case 'н' -> "n";
            case 'о' -> "o";
            case 'п' -> "p";
            case 'р' -> "r";
            case 'с' -> "s";
            case 'т' -> "t";
            case 'у' -> "u";
            case 'ф' -> "f";
            case 'х' -> "h";
            case 'ц' -> "ts";
            case 'ч' -> "ch";
            case 'ш' -> "sh";
            case 'щ' -> "sch";
            case 'ы' -> "y";
            case 'ю' -> "yu";
            case 'я' -> "ya";
            case 'ъ', 'ь' -> "";
            default -> String.valueOf(ch);
        };
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
