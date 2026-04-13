package com.lotus.game.service;

import com.lotus.game.dto.game.HeroDto;
import com.lotus.game.entity.Match;
import com.lotus.game.entity.User;
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

    private final UserRepository userRepository;
    private final HeroCatalog heroCatalog;
    private final HeroPortraitService heroPortraitService;
    private final PostMatchRewardService postMatchRewardService;

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
        userRepository.save(user);

        Set<String> unlockedSet = user.getUnlockedHeroIds();
        List<HeroDto> out = new ArrayList<>();
        for (HeroDto h : heroCatalog.listAll()) {
            boolean u = unlockedSet.contains(h.getId());
            out.add(toClientDto(h, u, null));
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
        userRepository.save(user);
        return user.getUnlockedHeroIds().contains(heroId.trim());
    }

    @Transactional
    public void onMatchFinishedForPlayers(Match match) {
        if (match.getStatus() != Match.MatchStatus.FINISHED || match.getPlayer2Id() == null) {
            return;
        }
        refreshAfterMatch(match.getPlayer1Id(), match.getId());
        refreshAfterMatch(match.getPlayer2Id(), match.getId());
    }

    private void refreshAfterMatch(Long userId, Long matchId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || isAdmin(user)) {
            return;
        }
        ensureStarterHero(user);
        userRepository.save(user);
        postMatchRewardService.grantPostMatchReward(userId, matchId);
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
