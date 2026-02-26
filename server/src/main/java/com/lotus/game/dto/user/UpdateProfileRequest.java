package com.lotus.game.dto.user;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileRequest {

    @Size(min = 2, max = 50)
    private String username;

    @Size(max = 512)
    private String avatarUrl;
}
