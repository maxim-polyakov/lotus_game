package com.lotus.game.dto.friends;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class FriendsOverviewDto {
    private List<FriendUserDto> friends;
    private List<FriendRequestDto> incoming;
    private List<FriendRequestDto> outgoing;
}
