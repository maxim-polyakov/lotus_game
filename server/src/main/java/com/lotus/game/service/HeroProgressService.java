package com.lotus.game.service;

import com.lotus.game.dto.game.HeroDto;
import com.lotus.game.entity.Match;
import com.lotus.game.entity.User;
import com.lotus.game.repository.MatchRepository;
import com.lotus.game.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class HeroProgressService {

    public static final String ADMIN_ROLE = "ROLE_ADMIN";
    /** Сколько завершённых PvP-матчей нужно на каждого следующего героя после стартового */
    public static final int MATCHES_PER_EXTRA_HERO = 3;

    private final UserRepository userRepository;
    private final MatchRepository matchRepository;
    private final HeroCatalog heroCatalog;
    private final HeroPortraitService heroPortraitService;

    public boolean isAdmin(User user) {
        return user.getRoles() != null && user.getRoles().contains(ADMIN_ROLE);
    }

    @Transactional
    public List<HeroDto> listHeroesForUser(Long userId) {
        User user = userRepository.findById(userId).orElseThrow();
        if (isAdmin(user)) {
            return heroCatalog.listAll().stream()
                    .map(h -> toClientDto(h, true, null))
                    .toList();
        }
        ensureStarterHero(user);
        long finished = matchRepository.countFinishedMatchesForUser(userId);
        syncUnlockedPool(user, finished);
        userRepository.save(user);

        Set<String> unlockedSet = user.getUnlockedHeroIds();
        int gamesUntilNext = gamesUntilNextUnlock(finished, unlockedSet.size());

        List<HeroDto> out = new ArrayList<>();
        for (HeroDto h : heroCatalog.listAll()) {
            boolean u = unlockedSet.contains(h.getId());
            out.add(toClientDto(h, u, u ? null : gamesUntilNext));
        }
        return out;
    }

    @Transactional
    public boolean canUseHero(Long userId, String heroId) {
        User user = userRepository.findById(userId).orElseThrow();
        if (isAdmin(user)) {
            heroCatalog.requireValid(heroId);
            return true;
        }
        heroCatalog.requireValid(heroId);
        ensureStarterHero(user);
        long finished = matchRepository.countFinishedMatchesForUser(userId);
        syncUnlockedPool(user, finished);
        userRepository.save(user);
        return user.getUnlockedHeroIds().contains(heroId.trim());
    }

    @Transactional
    public void onMatchFinishedForPlayers(Match match) {
        if (match.getStatus() != Match.MatchStatus.FINISHED || match.getPlayer2Id() == null) {
            return;
        }
        refreshAfterMatch(match.getPlayer1Id());
        refreshAfterMatch(match.getPlayer2Id());
    }

    private void refreshAfterMatch(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || isAdmin(user)) {
            return;
        }
        ensureStarterHero(user);
        long finished = matchRepository.countFinishedMatchesForUser(userId);
        syncUnlockedPool(user, finished);
        userRepository.save(user);
    }

    void ensureStarterHero(User user) {
        if (user.getUnlockedHeroIds() == null) {
            user.setUnlockedHeroIds(new LinkedHashSet<>());
        }
        if (!user.getUnlockedHeroIds().isEmpty()) {
            return;
        }
        List<String> all = heroCatalog.allHeroIds();
        String pick = all.get(ThreadLocalRandom.current().nextInt(all.size()));
        user.getUnlockedHeroIds().add(pick);
    }

    /**
     * Целевое число героев: 1 стартовый + по одному каждые {@link #MATCHES_PER_EXTRA_HERO} завершённых матчей.
     */
    void syncUnlockedPool(User user, long finishedMatches) {
        int cap = heroCatalog.heroCount();
        int target = (int) Math.min(cap, 1 + finishedMatches / MATCHES_PER_EXTRA_HERO);
        List<String> all = heroCatalog.allHeroIds();
        Set<String> raw = user.getUnlockedHeroIds();
        if (raw == null) {
            raw = new LinkedHashSet<>();
        }
        LinkedHashSet<String> unlocked = new LinkedHashSet<>(raw);
        if (unlocked.size() > target) {
            LinkedHashSet<String> trimmed = new LinkedHashSet<>();
            for (String id : unlocked) {
                if (trimmed.size() >= target) {
                    break;
                }
                trimmed.add(id);
            }
            unlocked = trimmed;
        }
        while (unlocked.size() < target) {
            List<String> locked = all.stream().filter(id -> !unlocked.contains(id)).toList();
            if (locked.isEmpty()) {
                break;
            }
            String pick = locked.get(ThreadLocalRandom.current().nextInt(locked.size()));
            unlocked.add(pick);
        }
        user.setUnlockedHeroIds(unlocked);
    }

    /** Сколько завершённых матчей не хватает до следующей разблокировки (0 если все открыты). */
    int gamesUntilNextUnlock(long finishedMatches, int numUnlocked) {
        int cap = heroCatalog.heroCount();
        if (numUnlocked >= cap) {
            return 0;
        }
        long threshold = (long) numUnlocked * MATCHES_PER_EXTRA_HERO;
        return (int) Math.max(0, threshold - finishedMatches);
    }

    private HeroDto toClientDto(HeroDto h, boolean unlocked, Integer gamesUntilUnlock) {
        String fromDb = heroPortraitService.resolvePortraitUrl(h.getId());
        String portrait = (fromDb != null && !fromDb.isBlank())
                ? fromDb
                : (h.getPortraitUrl() != null ? h.getPortraitUrl() : "");
        return HeroDto.builder()
                .id(h.getId())
                .name(h.getName())
                .portraitUrl(portrait)
                .startingHealth(h.getStartingHealth())
                .title(h.getTitle())
                .unlocked(unlocked)
                .gamesUntilUnlock(gamesUntilUnlock)
                .build();
    }
}
