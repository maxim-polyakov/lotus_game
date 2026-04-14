package com.lotus.game.dto.chat;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ActiveMatchChannelDto {
    private Long matchId;
}
