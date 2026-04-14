package com.lotus.game.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.Instant;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(min = 2, max = 50)
    @Column(unique = true, nullable = false, length = 50)
    private String username;

    @Column(name = "avatar_url", length = 512)
    private String avatarUrl;

    @NotBlank
    @Email
    @Column(unique = true, nullable = false)
    private String email;

    /** Null для пользователей, вошедших через Google OAuth */
    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "google_id", unique = true, length = 100)
    private String googleId;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "role")
    @Builder.Default
    private Set<String> roles = new HashSet<>();

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    private Instant lastLoginAt;

    @Column(nullable = false)
    @Builder.Default
    private boolean emailVerified = false;

    private String verificationCode;
    private Instant verificationCodeExpiresAt;

    private String passwordResetCode;
    private Instant passwordResetCodeExpiresAt;

    @Column(nullable = false, columnDefinition = "int default 1000")
    @Builder.Default
    private int rating = 1000;

    @Column(nullable = false, columnDefinition = "int default 0")
    @Builder.Default
    private int gold = 0;

    @Column(nullable = false, columnDefinition = "int default 0")
    @Builder.Default
    private int dust = 0;

    /** Герои, доступные в матчах (у новичка один случайный; админам не используется — им отдаются все в API) */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_unlocked_heroes", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "hero_id", length = 64)
    @Builder.Default
    private Set<String> unlockedHeroIds = new LinkedHashSet<>();

    /** Карты, доступные для составления/редактирования колод (формат ключа: TYPE:ID, например MINION:12). */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_unlocked_cards", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "card_key", length = 64)
    @Builder.Default
    private Set<String> unlockedCardKeys = new LinkedHashSet<>();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (roles.isEmpty()) {
            roles.add("ROLE_USER");
        }
        if (rating == 0) {
            rating = 1000;
        }
    }
}
