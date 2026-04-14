package com.lotus.game.dto.chat;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ChatMessageDto {
    private Long id;
    private String channelType; // GENERAL | PRIVATE | MATCH
    private String channelKey;
    private String fromUsername;
    private String text;
    private String createdAt;
}
