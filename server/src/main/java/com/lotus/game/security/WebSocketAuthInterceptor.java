package com.lotus.game.security;

import com.lotus.game.repository.MatchRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private static final Pattern MATCH_TOPIC = Pattern.compile("^/topic/match/(\\d+)$");

    private final JwtService jwtService;
    private final UserDetailsServiceImpl userDetailsService;
    private final MatchRepository matchRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) return message;

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String token = accessor.getFirstNativeHeader("token");
            if (token == null || token.isBlank()) {
                log.warn("WebSocket CONNECT without token");
                return null;
            }
            try {
                Claims claims = jwtService.parseToken(token);
                if (!jwtService.isAccessToken(claims)) {
                    log.warn("WebSocket CONNECT with non-access token");
                    return null;
                }
                String username = claims.getSubject();
                var userDetails = userDetailsService.loadUserByUsername(username);
                Principal principal = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                accessor.setUser(principal);
            } catch (JwtException | org.springframework.security.core.userdetails.UsernameNotFoundException e) {
                log.warn("WebSocket CONNECT invalid token: {}", e.getMessage());
                return null;
            }
        }

        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            Principal user = accessor.getUser();
            if (user == null) return null;
            String dest = accessor.getDestination();
            if (dest != null) {
                Matcher m = MATCH_TOPIC.matcher(dest);
                if (m.matches()) {
                    Long matchId = Long.parseLong(m.group(1));
                    Long userId = ((GameUserDetails) ((UsernamePasswordAuthenticationToken) user).getPrincipal()).getId();
                    var match = matchRepository.findById(matchId);
                    if (match.isEmpty()) return null;
                    var m = match.get();
                    if (!m.getPlayer1Id().equals(userId) && !java.util.Objects.equals(m.getPlayer2Id(), userId)) {
                        log.warn("User {} attempted to subscribe to match {} without access", userId, matchId);
                        return null;
                    }
                }
            }
        }
        return message;
    }
}
