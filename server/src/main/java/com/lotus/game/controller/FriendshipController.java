package com.lotus.game.controller;

import com.lotus.game.dto.friends.FriendsOverviewDto;
import com.lotus.game.dto.friends.SendFriendRequestDto;
import com.lotus.game.security.GameUserDetails;
import com.lotus.game.service.FriendshipService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/friends")
@RequiredArgsConstructor
public class FriendshipController {

    private final FriendshipService friendshipService;

    @GetMapping
    public ResponseEntity<FriendsOverviewDto> overview(@org.springframework.security.core.annotation.AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(friendshipService.getOverview(user.getId()));
    }

    @PostMapping("/requests")
    public ResponseEntity<?> sendRequest(@org.springframework.security.core.annotation.AuthenticationPrincipal GameUserDetails user,
                                         @Valid @RequestBody SendFriendRequestDto body) {
        if (user == null) return ResponseEntity.status(401).build();
        friendshipService.sendRequest(user.getId(), body.getUsername());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/requests/{id}/accept")
    public ResponseEntity<?> accept(@org.springframework.security.core.annotation.AuthenticationPrincipal GameUserDetails user,
                                    @PathVariable Long id) {
        if (user == null) return ResponseEntity.status(401).build();
        friendshipService.acceptRequest(user.getId(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/requests/{id}/decline")
    public ResponseEntity<?> decline(@org.springframework.security.core.annotation.AuthenticationPrincipal GameUserDetails user,
                                     @PathVariable Long id) {
        if (user == null) return ResponseEntity.status(401).build();
        friendshipService.declineRequest(user.getId(), id);
        return ResponseEntity.noContent().build();
    }
}
