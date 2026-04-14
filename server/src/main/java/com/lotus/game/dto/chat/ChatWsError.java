package com.lotus.game.dto.chat;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ChatWsError {
    private String error;
    private String context;
}
