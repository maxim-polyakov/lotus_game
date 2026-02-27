package com.lotus.game.dto.game;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReplayStepDto {
    private int stepIndex;
    private int turnNumber;
    private String actionType;  // "INIT", "PLAY", "ATTACK", "END_TURN"
    private Long playerId;
    private String description;
    private GameState gameState;
}
