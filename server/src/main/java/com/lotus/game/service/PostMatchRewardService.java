package com.lotus.game.service;

import com.lotus.game.dto.game.PostMatchDropSettingsDto;
import com.lotus.game.entity.User;
import com.lotus.game.entity.UserNotification;
import com.lotus.game.repository.UserNotificationRepository;
import com.lotus.game.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class PostMatchRewardService {

    private final UserRepository userRepository;
    private final UserNotificationRepository userNotificationRepository;
    private final HeroCatalog heroCatalog;
    private final NotificationService notificationService;
    private final GameConfigService gameConfigService;

    @Transactional
    public void grantPostMatchReward(Long userId, Long matchId) {
        if (userId == null || matchId == null) {
            return;
        }
        if (userNotificationRepository.existsByUserIdAndMatchId(userId, matchId)) {
            return;
        }

        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return;
        }

        boolean canHero = hasLockedHero(user);
        PostMatchDropSettingsDto cfg = gameConfigService.getPostMatchDropSettings();
        int wGold = cfg.getWeightGold();
        int wDust = cfg.getWeightDust();
        int wHero = canHero ? cfg.getWeightHero() : 0;
        int total = wGold + wDust + wHero;
        if (total <= 0) {
            wGold = 40;
            wDust = 40;
            wHero = canHero ? 20 : 0;
            total = wGold + wDust + wHero;
        }
        int roll = ThreadLocalRandom.current().nextInt(total);
        if (roll < wGold) {
            int lo = cfg.getGoldMin();
            int hi = cfg.getGoldMax();
            if (hi < lo) {
                int t = lo;
                lo = hi;
                hi = t;
            }
            int amount = ThreadLocalRandom.current().nextInt(lo, hi + 1);
            user.setGold(user.getGold() + amount);
            userRepository.save(user);
            notificationService.createRewardNotification(
                    userId,
                    matchId,
                    UserNotification.NotificationType.REWARD_GOLD,
                    "Награда за матч",
                    "Вы получили " + amount + " золота.",
                    null,
                    amount
            );
            return;
        }
        roll -= wGold;
        if (roll < wDust) {
            int lo = cfg.getDustMin();
            int hi = cfg.getDustMax();
            if (hi < lo) {
                int t = lo;
                lo = hi;
                hi = t;
            }
            int amount = ThreadLocalRandom.current().nextInt(lo, hi + 1);
            user.setDust(user.getDust() + amount);
            userRepository.save(user);
            notificationService.createRewardNotification(
                    userId,
                    matchId,
                    UserNotification.NotificationType.REWARD_DUST,
                    "Награда за матч",
                    "Вы получили " + amount + " пыли.",
                    null,
                    amount
            );
            return;
        }

        String heroId = unlockRandomHero(user);
        userRepository.save(user);
        if (heroId != null) {
            notificationService.createHeroUnlockNotification(userId, heroId, matchId);
        }
    }

    private boolean hasLockedHero(User user) {
        List<String> all = heroCatalog.allHeroIds();
        LinkedHashSet<String> unlocked = new LinkedHashSet<>(user.getUnlockedHeroIds() != null ? user.getUnlockedHeroIds() : List.of());
        return all.stream().anyMatch(id -> !unlocked.contains(id));
    }

    private String unlockRandomHero(User user) {
        List<String> all = heroCatalog.allHeroIds();
        LinkedHashSet<String> unlocked = new LinkedHashSet<>(user.getUnlockedHeroIds() != null ? user.getUnlockedHeroIds() : List.of());
        List<String> locked = all.stream().filter(id -> !unlocked.contains(id)).toList();
        if (locked.isEmpty()) {
            user.setUnlockedHeroIds(unlocked);
            return null;
        }
        String pick = locked.get(ThreadLocalRandom.current().nextInt(locked.size()));
        unlocked.add(pick);
        user.setUnlockedHeroIds(unlocked);
        return pick;
    }
}
