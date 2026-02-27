package com.lotus.game.dto.game;

import com.lotus.game.entity.Match;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MatchDto {

    private Long id;
    private Long player1Id;
    private Long player2Id;
    private Long deck1Id;
    private Long deck2Id;
    private Match.MatchMode matchMode;
    private Match.MatchStatus status;
    private Long winnerId;
    private Long currentTurnPlayerId;
    private String createdAt;
    private GameState gameState;

    public static MatchDto from(Match match) {
        return MatchDto.builder()
                .id(match.getId())
                .player1Id(match.getPlayer1Id())
                .player2Id(match.getPlayer2Id())
                .deck1Id(match.getDeck1Id())
                .deck2Id(match.getDeck2Id())
                .matchMode(match.getMatchMode())
                .status(match.getStatus())
                .winnerId(match.getWinnerId())
                .currentTurnPlayerId(match.getCurrentTurnPlayerId())
                .createdAt(match.getCreatedAt() != null ? match.getCreatedAt().toString() : null)
                .gameState(match.getGameState())
                .build();
    }
}
