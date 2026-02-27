package com.lotus.game.entity;

import com.lotus.game.dto.game.GameState;
import com.lotus.game.dto.game.ReplayStepDto;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "matches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Match {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "player1_id", nullable = false)
    private Long player1Id;

    @Column(name = "player2_id")
    private Long player2Id;

    @Column(name = "deck1_id", nullable = false)
    private Long deck1Id;

    @Column(name = "deck2_id")
    private Long deck2Id;

    @Column(name = "player1_rating")
    private Integer player1Rating;

    @Column(name = "player2_rating")
    private Integer player2Rating;

    @Enumerated(EnumType.STRING)
    @Column(name = "match_mode", nullable = false, length = 20)
    @Builder.Default
    private MatchMode matchMode = MatchMode.RANKED;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private MatchStatus status = MatchStatus.WAITING;

    @Column(name = "winner_id")
    private Long winnerId;

    @Column(name = "current_turn_player")
    private Long currentTurnPlayerId;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(columnDefinition = "text")
    @Convert(converter = com.lotus.game.config.GameStateConverter.class)
    private GameState gameState;

    @Column(name = "replay_data", columnDefinition = "text")
    @Convert(converter = com.lotus.game.config.ReplayStepsConverter.class)
    private java.util.List<ReplayStepDto> replaySteps = new java.util.ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public enum MatchStatus {
        WAITING,      // ожидает второго игрока
        IN_PROGRESS,
        FINISHED
    }

    public enum MatchMode {
        RANKED,   // влияет на рейтинг, матчмейкинг по силе
        CASUAL   // не влияет на рейтинг, свободный матчмейкинг
    }
}
