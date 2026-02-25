package com.lotus.game.dto.game;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class DeckCardSlotDto {

    @NotNull
    private CardDto.CardType cardType;

    @NotNull
    private Long cardId;

    @NotNull
    @Min(1)
    private Integer count;
}
