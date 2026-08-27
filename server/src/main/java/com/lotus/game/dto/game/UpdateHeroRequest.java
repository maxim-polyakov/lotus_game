package com.lotus.game.dto.game;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateHeroRequest {

    @Size(min = 2, max = 120)
    private String name;

    @Size(max = 180)
    private String title;

    @Min(1)
    @Max(100)
    private Integer startingHealth;
}
