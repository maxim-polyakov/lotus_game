package com.lotus.game.controller;

import com.lotus.game.dto.chat.ChatSendPrivateRequest;
import com.lotus.game.dto.chat.ChatSendRequest;
import com.lotus.game.dto.chat.ChatWsError;
import com.lotus.game.security.GameUserDetails;
import com.lotus.game.service.ChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
@Slf4j
public class ChatWebSocketController {

    private final ChatService chatService;

    @MessageMapping("/chat/send/general")
    public void sendGeneral(@Payload ChatSendRequest request, Principal principal) {
        GameUserDetails user = principalToUser(principal);
        chatService.sendGeneral(user.getId(), request != null ? request.getText() : null);
    }

    @MessageMapping("/chat/send/private")
    public void sendPrivate(@Payload ChatSendPrivateRequest request, Principal principal) {
        GameUserDetails user = principalToUser(principal);
        chatService.sendPrivate(
                user.getId(),
                request != null ? request.getUsername() : null,
                request != null ? request.getText() : null
        );
    }

    @MessageMapping("/chat/send/match/{matchId}")
    public void sendMatch(@Payload ChatSendRequest request,
                          @DestinationVariable Long matchId,
                          Principal principal) {
        GameUserDetails user = principalToUser(principal);
        chatService.sendMatch(user.getId(), matchId, request != null ? request.getText() : null);
    }

    @MessageExceptionHandler
    @SendToUser(destinations = "/queue/chat/errors", broadcast = false)
    public ChatWsError handleException(Exception e) {
        log.warn("Chat WebSocket error: {}", e.getMessage());
        return new ChatWsError(e.getMessage(), e.getClass().getSimpleName());
    }

    private GameUserDetails principalToUser(Principal principal) {
        if (principal == null) throw new IllegalArgumentException("Неавторизовано");
        return (GameUserDetails) ((org.springframework.security.authentication.UsernamePasswordAuthenticationToken) principal).getPrincipal();
    }
}
