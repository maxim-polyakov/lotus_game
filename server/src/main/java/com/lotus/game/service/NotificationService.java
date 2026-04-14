package com.lotus.game.service;

import com.lotus.game.dto.game.HeroDto;
import com.lotus.game.dto.game.NotificationDto;
import com.lotus.game.dto.game.CardDto;
import com.lotus.game.entity.UserNotification;
import com.lotus.game.repository.UserNotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final UserNotificationRepository userNotificationRepository;
    private final HeroCatalog heroCatalog;
    private final HeroPortraitService heroPortraitService;
    private final CardService cardService;

    @Transactional
    public void createHeroUnlockNotification(Long userId, String heroId, Long matchId) {
        HeroDto hero = heroCatalog.requireValid(heroId);
        UserNotification n = UserNotification.builder()
                .userId(userId)
                .type(UserNotification.NotificationType.HERO_UNLOCK)
                .title("Новый герой открыт")
                .message("После матча вам выпал герой: " + hero.getName())
                .heroId(heroId)
                .cardType(null)
                .cardId(null)
                .rewardAmount(null)
                .matchId(matchId)
                .read(false)
                .build();
        userNotificationRepository.save(n);
    }

    @Transactional
    public void createCardUnlockNotification(Long userId, CardDto.CardType cardType, Long cardId, String cardName, Long matchId) {
        UserNotification n = UserNotification.builder()
                .userId(userId)
                .type(UserNotification.NotificationType.CARD_UNLOCK)
                .title("Новая карта открыта")
                .message("После матча вам выпала карта: " + cardName)
                .heroId(null)
                .cardType(cardType != null ? cardType.name() : null)
                .cardId(cardId)
                .rewardAmount(null)
                .matchId(matchId)
                .read(false)
                .build();
        userNotificationRepository.save(n);
    }

    @Transactional
    public void createRewardNotification(Long userId,
                                         Long matchId,
                                         UserNotification.NotificationType type,
                                         String title,
                                         String message,
                                         String heroId,
                                         String cardType,
                                         Long cardId,
                                         Integer rewardAmount) {
        UserNotification n = UserNotification.builder()
                .userId(userId)
                .type(type)
                .title(title)
                .message(message)
                .heroId(heroId)
                .cardType(cardType)
                .cardId(cardId)
                .rewardAmount(rewardAmount)
                .matchId(matchId)
                .read(false)
                .build();
        userNotificationRepository.save(n);
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> listForUser(Long userId) {
        return userNotificationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<NotificationDto> latestUnreadPostMatchReward(Long userId, Long matchId) {
        if (matchId == null) {
            return Optional.empty();
        }
        return userNotificationRepository.findFirstByUserIdAndMatchIdAndReadFalseOrderByCreatedAtDesc(userId, matchId)
                .map(this::toDto);
    }

    @Transactional(readOnly = true)
    public Optional<NotificationDto> latestUnreadFriendOnline(Long userId) {
        return userNotificationRepository.findFirstByUserIdAndTypeAndReadFalseOrderByCreatedAtDesc(
                        userId, UserNotification.NotificationType.FRIEND_ONLINE
                )
                .map(this::toDto);
    }

    @Transactional
    public void markRead(Long userId, Long notificationId) {
        UserNotification n = userNotificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Уведомление не найдено"));
        if (!n.isRead()) {
            n.setRead(true);
            userNotificationRepository.save(n);
        }
    }

    @Transactional
    public NotificationDto createFriendOnlineNotification(Long userId, String friendUsername) {
        String safeName = (friendUsername == null || friendUsername.isBlank()) ? "Ваш друг" : friendUsername;
        UserNotification n = UserNotification.builder()
                .userId(userId)
                .type(UserNotification.NotificationType.FRIEND_ONLINE)
                .title("Друг в сети")
                .message(safeName + " вошёл в игру")
                .heroId(null)
                .cardType(null)
                .cardId(null)
                .rewardAmount(null)
                .matchId(null)
                .read(false)
                .build();
        UserNotification saved = userNotificationRepository.save(n);
        return toDto(saved);
    }

    private NotificationDto toDto(UserNotification n) {
        String heroName = null;
        String heroPortrait = null;
        String cardName = null;
        if (n.getHeroId() != null && !n.getHeroId().isBlank()) {
            heroName = heroCatalog.find(n.getHeroId()).map(HeroDto::getName).orElse(n.getHeroId());
            heroPortrait = heroPortraitService.resolvePortraitUrl(n.getHeroId());
            if (heroPortrait == null) {
                heroPortrait = "";
            }
        }
        if (n.getCardType() != null && n.getCardId() != null) {
            try {
                cardName = cardService.getCard(n.getCardType(), n.getCardId()).getName();
            } catch (Exception ignored) {
                cardName = n.getCardType() + " #" + n.getCardId();
            }
        }
        return NotificationDto.from(n, heroName, heroPortrait, cardName);
    }
}
