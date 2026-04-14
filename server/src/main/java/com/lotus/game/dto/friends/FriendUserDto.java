package com.lotus.game.dto.friends;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FriendUserDto {
    private Long id;
    private String username;
    private String avatarUrl;
    private int rating;
}
