package com.lotus.game.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "chat_messages", indexes = {
        @Index(name = "idx_chat_channel_key", columnList = "channel_key"),
        @Index(name = "idx_chat_created_at", columnList = "created_at"),
        @Index(name = "idx_chat_sender", columnList = "sender_id"),
        @Index(name = "idx_chat_recipient", columnList = "recipient_user_id"),
        @Index(name = "idx_chat_match", columnList = "match_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage {

    public enum ChannelType {
        GENERAL,
        PRIVATE,
        MATCH
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel_type", nullable = false, length = 20)
    private ChannelType channelType;

    @Column(name = "channel_key", nullable = false, length = 160)
    private String channelKey;

    @Column(name = "sender_id", nullable = false)
    private Long senderId;

    @Column(name = "sender_username", nullable = false, length = 80)
    private String senderUsername;

    @Column(name = "sender_avatar_url", length = 512)
    private String senderAvatarUrl;

    @Column(name = "recipient_user_id")
    private Long recipientUserId;

    @Column(name = "match_id")
    private Long matchId;

    @Column(name = "text", nullable = false, length = 1000)
    private String text;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
