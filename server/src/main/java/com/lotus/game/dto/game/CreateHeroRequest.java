package com.lotus.game.dto.game;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateHeroRequest {

    /** Optional. If blank, server generates id from name. */
    @Pattern(regexp = "^$|^[a-z0-9_]{3,64}$", message = "ID героя: 3–64 символа a-z, 0-9 и _")
    private String id;

    @NotBlank
    @Size(min = 2, max = 120)
    private String name;

    @Size(max = 180)
    private String title;

    @Min(1)
    @Max(100)
    private Integer startingHealth;
}
