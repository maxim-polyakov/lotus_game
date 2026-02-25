package com.lotus.game.dto.game;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class CreateDeckRequest {

    @NotBlank
    @Size(min = 1, max = 50)
    private String name;

    @Valid
    @Size(min = 1, max = 30)
    private List<DeckCardSlotDto> cards;
}
