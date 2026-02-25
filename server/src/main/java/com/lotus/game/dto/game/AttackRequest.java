package com.lotus.game.dto.game;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AttackRequest {

    @NotBlank(message = "Instance ID of attacking minion on your board")
    private String attackerInstanceId;

    @NotBlank(message = "Instance ID of target (enemy minion or 'hero' for face)")
    private String targetInstanceId;
}
