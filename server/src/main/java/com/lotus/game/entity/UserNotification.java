package com.lotus.game.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "user_notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserNotification {

    public enum NotificationType {
        HERO_UNLOCK,
        CARD_UNLOCK,
        REWARD_GOLD,
        REWARD_DUST
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 40)
    private NotificationType type;

    @Column(name = "title", nullable = false, length = 150)
    private String title;

    @Column(name = "message", nullable = false, length = 1000)
    private String message;

    @Column(name = "hero_id", length = 64)
    private String heroId;

    @Column(name = "card_type", length = 16)
    private String cardType;

    @Column(name = "card_id")
    private Long cardId;

    @Column(name = "reward_amount")
    private Integer rewardAmount;

    @Column(name = "match_id")
    private Long matchId;

    @Column(name = "read_flag", nullable = false)
    @Builder.Default
    private boolean read = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
