package com.lotus.game.controller;

import com.lotus.game.dto.game.*;
import com.lotus.game.entity.Match;
import com.lotus.game.security.GameUserDetails;
import com.lotus.game.service.MatchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Map;

@Controller
@RequiredArgsConstructor
@Slf4j
public class MatchWebSocketController {

    private final MatchService matchService;

    @MessageMapping("/matches/find")
    @SendToUser(destinations = "/queue/matches", broadcast = false)
    public MatchDto findMatch(@Payload FindMatchWsRequest request, Principal principal) {
        GameUserDetails user = (GameUserDetails) ((org.springframework.security.authentication.UsernamePasswordAuthenticationToken) principal).getPrincipal();
        Match.MatchMode mode = "CASUAL".equalsIgnoreCase(request.getMode()) ? Match.MatchMode.CASUAL : Match.MatchMode.RANKED;
        return matchService.findOrCreateMatch(user.getId(), request.getDeckId(), mode, request.getHeroId());
    }

    @MessageMapping("/matches/{matchId}/play")
    public void playCard(@Payload Map<String, Object> payload,
                         @org.springframework.messaging.handler.annotation.DestinationVariable Long matchId,
                         Principal principal) {
        GameUserDetails user = (GameUserDetails) ((org.springframework.security.authentication.UsernamePasswordAuthenticationToken) principal).getPrincipal();
        PlayCardRequest req = new PlayCardRequest();
        req.setInstanceId((String) payload.get("instanceId"));
        req.setTargetPosition(payload.get("targetPosition") != null ? ((Number) payload.get("targetPosition")).intValue() : null);
        req.setTargetInstanceId((String) payload.get("targetInstanceId"));
        matchService.playCard(matchId, user.getId(), req);
    }

    @MessageMapping("/matches/{matchId}/attack")
    public void attack(@Payload Map<String, Object> payload,
                       @org.springframework.messaging.handler.annotation.DestinationVariable Long matchId,
                       Principal principal) {
        GameUserDetails user = (GameUserDetails) ((org.springframework.security.authentication.UsernamePasswordAuthenticationToken) principal).getPrincipal();
        AttackRequest req = new AttackRequest();
        req.setAttackerInstanceId((String) payload.get("attackerInstanceId"));
        req.setTargetInstanceId((String) payload.get("targetInstanceId"));
        matchService.attack(matchId, user.getId(), req);
    }

    @MessageMapping("/matches/{matchId}/end-turn")
    public void endTurn(@org.springframework.messaging.handler.annotation.DestinationVariable Long matchId,
                        Principal principal) {
        GameUserDetails user = (GameUserDetails) ((org.springframework.security.authentication.UsernamePasswordAuthenticationToken) principal).getPrincipal();
        matchService.endTurn(matchId, user.getId());
    }

    @MessageMapping("/matches/{matchId}/get")
    @SendToUser(destinations = "/queue/matches", broadcast = false)
    public MatchDto getMatch(@org.springframework.messaging.handler.annotation.DestinationVariable Long matchId,
                             Principal principal) {
        GameUserDetails user = (GameUserDetails) ((org.springframework.security.authentication.UsernamePasswordAuthenticationToken) principal).getPrincipal();
        return matchService.getMatch(matchId, user.getId());
    }

    @MessageExceptionHandler
    @SendToUser(destinations = "/queue/matches/errors", broadcast = false)
    public MatchWsError handleException(Exception e) {
        log.warn("Match WebSocket error: {}", e.getMessage());
        return new MatchWsError(e.getMessage(), e.getClass().getSimpleName());
    }
}
