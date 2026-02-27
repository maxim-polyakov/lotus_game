package com.lotus.game.dto.game;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateSpellRequest {

    @Size(min = 1, max = 100)
    private String name;

    @Min(0)
    private Integer manaCost;

    @Size(max = 500)
    private String description;

    @Min(0)
    private Integer damage;
}
