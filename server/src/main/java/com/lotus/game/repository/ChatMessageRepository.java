package com.lotus.game.repository;

import com.lotus.game.entity.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findByChannelKeyOrderByCreatedAtDesc(String channelKey, Pageable pageable);

    List<ChatMessage> findByChannelTypeAndMatchIdOrderByCreatedAtDesc(ChatMessage.ChannelType channelType, Long matchId, Pageable pageable);

    List<ChatMessage> findByChannelTypeAndSenderIdOrChannelTypeAndRecipientUserIdOrderByCreatedAtDesc(
            ChatMessage.ChannelType senderType, Long senderId,
            ChatMessage.ChannelType recipientType, Long recipientId,
            Pageable pageable
    );

    long countByChannelKeyAndSenderIdNot(String channelKey, Long senderId);

    long countByChannelKeyAndIdGreaterThanAndSenderIdNot(String channelKey, Long id, Long senderId);

    Optional<ChatMessage> findFirstByChannelKeyOrderByIdDesc(String channelKey);
}
