package com.lotus.game.dto.chat;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PrivateDialogDto {
    private String username;
    private String avatarUrl;
    private String channelKey;
    private String lastMessage;
    private String lastCreatedAt;
    private int unreadCount;
}
