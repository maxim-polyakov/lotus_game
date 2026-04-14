package com.lotus.game.dto.friends;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SendFriendRequestDto {
    @NotBlank
    @Size(min = 2, max = 50)
    private String username;
}
