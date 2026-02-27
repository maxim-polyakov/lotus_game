package com.lotus.game.dto.game;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateMinionRequest {

    @Size(min = 1, max = 100)
    private String name;

    @Min(0)
    private Integer manaCost;

    @Min(0)
    private Integer attack;

    @Min(0)
    private Integer health;

    @Size(max = 500)
    private String description;

    private Boolean taunt;
    private Boolean charge;
    private Boolean divineShield;

    private String battlecryType;
    private Integer battlecryValue;
    private String battlecryTarget;
    private Long battlecrySummonCardId;
    private String deathrattleType;
    private Integer deathrattleValue;
    private Long deathrattleSummonCardId;
}
