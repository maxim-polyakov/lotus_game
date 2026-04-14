package com.lotus.game.dto.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChatSendRequest {
    @NotBlank
    @Size(max = 1000)
    private String text;
}
