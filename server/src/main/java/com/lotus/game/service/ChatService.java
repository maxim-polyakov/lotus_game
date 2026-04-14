package com.lotus.game.service;

import com.lotus.game.dto.chat.ChatMessageDto;
import com.lotus.game.dto.chat.ChatUnreadSummaryDto;
import com.lotus.game.dto.chat.PrivateDialogDto;
import com.lotus.game.entity.ChatChannelReadState;
import com.lotus.game.entity.ChatMessage;
import com.lotus.game.entity.Match;
import com.lotus.game.entity.User;
import com.lotus.game.repository.ChatMessageRepository;
import com.lotus.game.repository.ChatChannelReadStateRepository;
import com.lotus.game.repository.MatchRepository;
import com.lotus.game.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatService {

    private static final int MAX_MESSAGES_PER_CHANNEL = 500;
    private static final int MAX_DIALOG_SCAN_MESSAGES = 2000;
    private static final String GENERAL_KEY = "general";

    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;
    private final MatchRepository matchRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatChannelReadStateRepository readStateRepository;

    @Transactional(readOnly = true)
    public List<ChatMessageDto> getGeneralHistory(int limit) {
        return tailByChannelKey(GENERAL_KEY, limit);
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDto> getPrivateHistory(Long userId, String username, int limit) {
        User me = userRepository.findById(userId).orElseThrow();
        User peer = userRepository.findByUsernameIgnoreCase(username == null ? "" : username.trim())
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
        String key = privateKey(me.getUsername(), peer.getUsername());
        return tailByChannelKey(key, limit);
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDto> getMatchHistory(Long userId, Long matchId, int limit) {
        Match m = requireMatchAccess(userId, matchId);
        int n = clampLimit(limit);
        List<ChatMessage> desc = chatMessageRepository.findByChannelTypeAndMatchIdOrderByCreatedAtDesc(
                ChatMessage.ChannelType.MATCH, m.getId(), PageRequest.of(0, n)
        );
        return toChronologicalDtos(desc);
    }

    @Transactional(readOnly = true)
    public List<PrivateDialogDto> getPrivateDialogs(Long userId, int limit) {
        User me = userRepository.findById(userId).orElseThrow();
        int n = Math.min(Math.max(limit, 1), 200);
        List<ChatMessage> rows = chatMessageRepository
                .findByChannelTypeAndSenderIdOrChannelTypeAndRecipientUserIdOrderByCreatedAtDesc(
                        ChatMessage.ChannelType.PRIVATE, userId,
                        ChatMessage.ChannelType.PRIVATE, userId,
                        PageRequest.of(0, MAX_DIALOG_SCAN_MESSAGES)
                );

        HashMap<String, ChatMessage> latestByPeer = new HashMap<>();
        for (ChatMessage row : rows) {
            String peerUsername = resolvePeerUsername(me.getUsername(), row.getChannelKey());
            if (peerUsername == null || latestByPeer.containsKey(peerUsername)) continue;
            latestByPeer.put(peerUsername, row);
            if (latestByPeer.size() >= n) break;
        }

        Set<String> peerNames = latestByPeer.keySet();
        var usersByUsername = userRepository.findAll().stream()
                .filter(u -> peerNames.contains(u.getUsername().toLowerCase()))
                .collect(Collectors.toMap(u -> u.getUsername().toLowerCase(), u -> u));
        var readStates = readStateRepository.findByUserId(userId).stream()
                .collect(Collectors.toMap(ChatChannelReadState::getChannelKey, ChatChannelReadState::getLastReadMessageId));

        return latestByPeer.entrySet().stream()
                .map(e -> {
                    String peer = e.getKey();
                    ChatMessage m = e.getValue();
                    User u = usersByUsername.get(peer);
                    String key = m.getChannelKey();
                    return PrivateDialogDto.builder()
                            .username(u != null ? u.getUsername() : peer)
                            .avatarUrl(u != null ? u.getAvatarUrl() : null)
                            .channelKey(key)
                            .lastMessage(m.getText())
                            .lastCreatedAt(m.getCreatedAt() != null ? m.getCreatedAt().toString() : null)
                            .unreadCount((int) countUnreadByChannelKey(userId, key, readStates.get(key)))
                            .build();
                })
                .sorted((a, b) -> String.valueOf(b.getLastCreatedAt()).compareTo(String.valueOf(a.getLastCreatedAt())))
                .limit(n)
                .toList();
    }

    @Transactional(readOnly = true)
    public Long getActiveMatchChannelId(Long userId) {
        return matchRepository.findByPlayer1IdOrPlayer2IdOrderByCreatedAtDesc(userId, userId).stream()
                .filter(m -> m.getStatus() == Match.MatchStatus.IN_PROGRESS)
                .filter(m -> Objects.equals(m.getPlayer1Id(), userId) || Objects.equals(m.getPlayer2Id(), userId))
                .map(Match::getId)
                .findFirst()
                .orElse(null);
    }

    @Transactional
    public ChatMessageDto sendGeneral(Long userId, String text) {
        User me = userRepository.findById(userId).orElseThrow();
        ChatMessage saved = persist(ChatMessage.ChannelType.GENERAL, GENERAL_KEY, me, null, null, text);
        ChatMessageDto dto = toDto(saved);
        messagingTemplate.convertAndSend("/topic/chat/general", dto);
        return dto;
    }

    @Transactional
    public ChatMessageDto sendPrivate(Long userId, String peerUsername, String text) {
        User me = userRepository.findById(userId).orElseThrow();
        User peer = userRepository.findByUsernameIgnoreCase(peerUsername == null ? "" : peerUsername.trim())
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
        if (Objects.equals(me.getId(), peer.getId())) {
            throw new IllegalArgumentException("Нельзя писать самому себе");
        }

        String key = privateKey(me.getUsername(), peer.getUsername());
        ChatMessage saved = persist(ChatMessage.ChannelType.PRIVATE, key, me, peer.getId(), null, text);
        ChatMessageDto dto = toDto(saved);
        messagingTemplate.convertAndSendToUser(me.getUsername(), "/queue/chat/private", dto);
        messagingTemplate.convertAndSendToUser(peer.getUsername(), "/queue/chat/private", dto);
        return dto;
    }

    @Transactional
    public ChatMessageDto sendMatch(Long userId, Long matchId, String text) {
        Match m = requireMatchAccess(userId, matchId);
        User me = userRepository.findById(userId).orElseThrow();
        String key = matchKey(m.getId());
        ChatMessage saved = persist(ChatMessage.ChannelType.MATCH, key, me, null, m.getId(), text);
        ChatMessageDto dto = toDto(saved);
        messagingTemplate.convertAndSend("/topic/chat/match/" + m.getId(), dto);
        return dto;
    }

    @Transactional(readOnly = true)
    public ChatUnreadSummaryDto getUnreadSummary(Long userId) {
        var readStates = readStateRepository.findByUserId(userId).stream()
                .collect(Collectors.toMap(ChatChannelReadState::getChannelKey, ChatChannelReadState::getLastReadMessageId));
        HashMap<String, Integer> out = new HashMap<>();

        out.put(GENERAL_KEY, (int) countUnreadByChannelKey(userId, GENERAL_KEY, readStates.get(GENERAL_KEY)));

        Long activeMatch = getActiveMatchChannelId(userId);
        if (activeMatch != null) {
            String key = matchKey(activeMatch);
            out.put(key, (int) countUnreadByChannelKey(userId, key, readStates.get(key)));
        }

        List<ChatMessage> rows = chatMessageRepository
                .findByChannelTypeAndSenderIdOrChannelTypeAndRecipientUserIdOrderByCreatedAtDesc(
                        ChatMessage.ChannelType.PRIVATE, userId,
                        ChatMessage.ChannelType.PRIVATE, userId,
                        PageRequest.of(0, MAX_DIALOG_SCAN_MESSAGES)
                );
        rows.stream()
                .map(ChatMessage::getChannelKey)
                .filter(k -> k != null && k.startsWith("private:"))
                .distinct()
                .forEach(k -> out.put(k, (int) countUnreadByChannelKey(userId, k, readStates.get(k))));

        return ChatUnreadSummaryDto.builder().countsByChannelKey(out).build();
    }

    @Transactional
    public void markGeneralRead(Long userId) {
        markChannelRead(userId, GENERAL_KEY);
    }

    @Transactional
    public void markPrivateRead(Long userId, String username) {
        User me = userRepository.findById(userId).orElseThrow();
        User peer = userRepository.findByUsernameIgnoreCase(username == null ? "" : username.trim())
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
        markChannelRead(userId, privateKey(me.getUsername(), peer.getUsername()));
    }

    @Transactional
    public void markMatchRead(Long userId, Long matchId) {
        Match m = requireMatchAccess(userId, matchId);
        markChannelRead(userId, matchKey(m.getId()));
    }

    private Match requireMatchAccess(Long userId, Long matchId) {
        Match m = matchRepository.findById(matchId)
                .orElseThrow(() -> new IllegalArgumentException("Матч не найден"));
        boolean participant = Objects.equals(m.getPlayer1Id(), userId) || Objects.equals(m.getPlayer2Id(), userId);
        if (!participant) {
            throw new IllegalArgumentException("Нет доступа к чату матча");
        }
        if (m.getPlayer2Id() == null) {
            throw new IllegalArgumentException("Канал матча доступен после подключения второго игрока");
        }
        return m;
    }

    private String validateText(String textRaw) {
        String text = textRaw == null ? "" : textRaw.trim();
        if (text.isEmpty()) throw new IllegalArgumentException("Пустое сообщение");
        if (text.length() > 1000) throw new IllegalArgumentException("Сообщение слишком длинное");
        return text;
    }

    private ChatMessage persist(ChatMessage.ChannelType type,
                                String channelKey,
                                User sender,
                                Long recipientUserId,
                                Long matchId,
                                String textRaw) {
        String text = validateText(textRaw);
        ChatMessage message = ChatMessage.builder()
                .channelType(type)
                .channelKey(channelKey)
                .senderId(sender.getId())
                .senderUsername(sender.getUsername())
                .recipientUserId(recipientUserId)
                .matchId(matchId)
                .text(text)
                .build();
        return chatMessageRepository.save(message);
    }

    private List<ChatMessageDto> tailByChannelKey(String key, int limit) {
        int n = clampLimit(limit);
        List<ChatMessage> desc = chatMessageRepository.findByChannelKeyOrderByCreatedAtDesc(key, PageRequest.of(0, n));
        return toChronologicalDtos(desc);
    }

    private static int clampLimit(int limit) {
        return Math.min(Math.max(limit, 1), MAX_MESSAGES_PER_CHANNEL);
    }

    private List<ChatMessageDto> toChronologicalDtos(List<ChatMessage> desc) {
        if (desc == null || desc.isEmpty()) return List.of();
        List<ChatMessageDto> out = new ArrayList<>(desc.size());
        for (int i = desc.size() - 1; i >= 0; i--) {
            out.add(toDto(desc.get(i)));
        }
        return out;
    }

    private ChatMessageDto toDto(ChatMessage m) {
        return ChatMessageDto.builder()
                .id(m.getId())
                .channelType(m.getChannelType() != null ? m.getChannelType().name() : null)
                .channelKey(m.getChannelKey())
                .fromUsername(m.getSenderUsername())
                .text(m.getText())
                .createdAt(m.getCreatedAt() != null ? m.getCreatedAt().toString() : Instant.now().toString())
                .build();
    }

    private long countUnreadByChannelKey(Long userId, String channelKey, Long lastReadMessageId) {
        if (channelKey == null || channelKey.isBlank()) return 0;
        if (lastReadMessageId == null) {
            return chatMessageRepository.countByChannelKeyAndSenderIdNot(channelKey, userId);
        }
        return chatMessageRepository.countByChannelKeyAndIdGreaterThanAndSenderIdNot(channelKey, lastReadMessageId, userId);
    }

    private void markChannelRead(Long userId, String channelKey) {
        Instant now = Instant.now();
        Long lastMessageId = chatMessageRepository.findFirstByChannelKeyOrderByIdDesc(channelKey)
                .map(ChatMessage::getId)
                .orElse(null);
        ChatChannelReadState state = readStateRepository.findByUserIdAndChannelKey(userId, channelKey).orElse(null);
        if (state == null) {
            readStateRepository.save(ChatChannelReadState.builder()
                    .userId(userId)
                    .channelKey(channelKey)
                    .lastReadMessageId(lastMessageId)
                    .updatedAt(now)
                    .build());
            return;
        }
        state.setLastReadMessageId(lastMessageId);
        state.setUpdatedAt(now);
        readStateRepository.save(state);
    }

    private static String resolvePeerUsername(String myUsername, String channelKey) {
        if (channelKey == null || !channelKey.startsWith("private:")) return null;
        String[] parts = channelKey.split(":");
        if (parts.length != 3) return null;
        String me = myUsername == null ? "" : myUsername.trim().toLowerCase();
        if (parts[1].equals(me)) return parts[2];
        if (parts[2].equals(me)) return parts[1];
        return null;
    }

    private static String privateKey(String a, String b) {
        String x = a == null ? "" : a.trim().toLowerCase();
        String y = b == null ? "" : b.trim().toLowerCase();
        return x.compareTo(y) <= 0 ? ("private:" + x + ":" + y) : ("private:" + y + ":" + x);
    }

    private static String matchKey(Long matchId) {
        return "match:" + matchId;
    }
}
