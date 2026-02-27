package com.lotus.game.dto.game;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameState {

    @Builder.Default
    private PlayerState player1 = new PlayerState();
    @Builder.Default
    private PlayerState player2 = new PlayerState();
    private int turnNumber;
    private Long currentTurnPlayerId;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PlayerState {
        @Builder.Default
        private int health = 30;
        @Builder.Default
        private int mana = 0;
        @Builder.Default
        private int maxMana = 0;
        @Builder.Default
        private int fatigueCounter = 0;
        @Builder.Default
        private List<CardRef> deck = new ArrayList<>();
        @Builder.Default
        private List<CardInHand> hand = new ArrayList<>();
        @Builder.Default
        private List<BoardMinion> board = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CardRef {
        private String cardType;
        private Long cardId;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CardInHand {
        private String instanceId;
        private String cardType;
        private Long cardId;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BoardMinion {
        private String instanceId;
        private Long cardId;
        private int attack;
        private int currentHealth;
        private int maxHealth;
        private boolean canAttack;
        private boolean exhausted;
        @Builder.Default
        private boolean taunt = false;
        @Builder.Default
        private boolean divineShield = false;
    }
}
