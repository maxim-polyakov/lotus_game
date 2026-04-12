package com.lotus.game.dto.game;

import lombok.Data;

@Data
public class FindMatchWsRequest {
    private Long deckId;
    private String mode;
    private String heroId;
}
