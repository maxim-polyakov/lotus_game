package com.lotus.game.service;

import com.lotus.game.dto.game.MatchDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class MatchBroadcastService {

    private static final String MATCH_TOPIC_PREFIX = "/topic/match/";

    private final SimpMessagingTemplate messagingTemplate;

    public void broadcastMatchUpdate(Long matchId, MatchDto match) {
        String destination = MATCH_TOPIC_PREFIX + matchId;
        messagingTemplate.convertAndSend(destination, match);
        log.debug("Broadcast match {} update to {}", matchId, destination);
    }
}
