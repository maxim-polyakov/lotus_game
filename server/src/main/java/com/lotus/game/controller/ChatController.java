package com.lotus.game.controller;

import com.lotus.game.dto.chat.ActiveMatchChannelDto;
import com.lotus.game.dto.chat.ChatMessageDto;
import com.lotus.game.dto.chat.ChatUnreadSummaryDto;
import com.lotus.game.dto.chat.PrivateDialogDto;
import com.lotus.game.dto.chat.ChatSendPrivateRequest;
import com.lotus.game.dto.chat.ChatSendRequest;
import com.lotus.game.security.GameUserDetails;
import com.lotus.game.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @GetMapping("/history/general")
    public ResponseEntity<List<ChatMessageDto>> general(@org.springframework.security.core.annotation.AuthenticationPrincipal GameUserDetails user,
                                                        @RequestParam(defaultValue = "80") int limit) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(chatService.getGeneralHistory(limit));
    }

    @GetMapping("/history/private/{username}")
    public ResponseEntity<List<ChatMessageDto>> privateHistory(@org.springframework.security.core.annotation.AuthenticationPrincipal GameUserDetails user,
                                                               @PathVariable String username,
                                                               @RequestParam(defaultValue = "80") int limit) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(chatService.getPrivateHistory(user.getId(), username, limit));
    }

    @GetMapping("/private-dialogs")
    public ResponseEntity<List<PrivateDialogDto>> privateDialogs(@org.springframework.security.core.annotation.AuthenticationPrincipal GameUserDetails user,
                                                                 @RequestParam(defaultValue = "30") int limit) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(chatService.getPrivateDialogs(user.getId(), limit));
    }

    @GetMapping("/unread")
    public ResponseEntity<ChatUnreadSummaryDto> unread(@org.springframework.security.core.annotation.AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(chatService.getUnreadSummary(user.getId()));
    }

    @GetMapping("/history/match/{matchId}")
    public ResponseEntity<List<ChatMessageDto>> matchHistory(@org.springframework.security.core.annotation.AuthenticationPrincipal GameUserDetails user,
                                                             @PathVariable Long matchId,
                                                             @RequestParam(defaultValue = "80") int limit) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(chatService.getMatchHistory(user.getId(), matchId, limit));
    }

    @GetMapping("/active-match")
    public ResponseEntity<ActiveMatchChannelDto> activeMatch(@org.springframework.security.core.annotation.AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(ActiveMatchChannelDto.builder()
                .matchId(chatService.getActiveMatchChannelId(user.getId()))
                .build());
    }

    @PostMapping("/read/general")
    public ResponseEntity<Void> readGeneral(@org.springframework.security.core.annotation.AuthenticationPrincipal GameUserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();
        chatService.markGeneralRead(user.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/read/private/{username}")
    public ResponseEntity<Void> readPrivate(@org.springframework.security.core.annotation.AuthenticationPrincipal GameUserDetails user,
                                            @PathVariable String username) {
        if (user == null) return ResponseEntity.status(401).build();
        chatService.markPrivateRead(user.getId(), username);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/read/match/{matchId}")
    public ResponseEntity<Void> readMatch(@org.springframework.security.core.annotation.AuthenticationPrincipal GameUserDetails user,
                                          @PathVariable Long matchId) {
        if (user == null) return ResponseEntity.status(401).build();
        chatService.markMatchRead(user.getId(), matchId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/send/general")
    public ResponseEntity<ChatMessageDto> sendGeneral(@org.springframework.security.core.annotation.AuthenticationPrincipal GameUserDetails user,
                                                      @Valid @RequestBody ChatSendRequest body) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(chatService.sendGeneral(user.getId(), body.getText()));
    }

    @PostMapping("/send/private")
    public ResponseEntity<ChatMessageDto> sendPrivate(@org.springframework.security.core.annotation.AuthenticationPrincipal GameUserDetails user,
                                                      @Valid @RequestBody ChatSendPrivateRequest body) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(chatService.sendPrivate(user.getId(), body.getUsername(), body.getText()));
    }

    @PostMapping("/send/match/{matchId}")
    public ResponseEntity<ChatMessageDto> sendMatch(@org.springframework.security.core.annotation.AuthenticationPrincipal GameUserDetails user,
                                                    @PathVariable Long matchId,
                                                    @Valid @RequestBody ChatSendRequest body) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(chatService.sendMatch(user.getId(), matchId, body.getText()));
    }
}
