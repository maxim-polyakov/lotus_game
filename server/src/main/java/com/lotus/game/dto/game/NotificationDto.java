package com.lotus.game.dto.game;

import com.lotus.game.entity.UserNotification;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class NotificationDto {
    private Long id;
    private String type;
    private String title;
    private String message;
    private String heroId;
    private String heroName;
    private String heroPortraitUrl;
    private String cardType;
    private Long cardId;
    private String cardName;
    private Integer rewardAmount;
    private Long matchId;
    private boolean read;
    private String createdAt;

    public static NotificationDto from(UserNotification n, String heroName, String heroPortraitUrl, String cardName) {
        return NotificationDto.builder()
                .id(n.getId())
                .type(n.getType() != null ? n.getType().name() : null)
                .title(n.getTitle())
                .message(n.getMessage())
                .heroId(n.getHeroId())
                .heroName(heroName)
                .heroPortraitUrl(heroPortraitUrl)
                .cardType(n.getCardType())
                .cardId(n.getCardId())
                .cardName(cardName)
                .rewardAmount(n.getRewardAmount())
                .matchId(n.getMatchId())
                .read(n.isRead())
                .createdAt(n.getCreatedAt() != null ? n.getCreatedAt().toString() : null)
                .build();
    }
}
