package com.lotus.game.dto.game;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PlayCardRequest {

    @NotBlank(message = "Instance ID of the card in hand")
    private String instanceId;

    /** Target position on board (0-6) for minions, null for spells */
    private Integer targetPosition;
}
