package com.lotus.game.dto.friends;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FriendRequestDto {
    private Long requestId;
    private String createdAt;
    private FriendUserDto user;
}
