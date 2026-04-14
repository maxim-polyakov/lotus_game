package com.lotus.game.dto.chat;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class ChatUnreadSummaryDto {
    private Map<String, Integer> countsByChannelKey;
}
