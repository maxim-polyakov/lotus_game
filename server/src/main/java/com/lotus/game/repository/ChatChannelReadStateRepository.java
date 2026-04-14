package com.lotus.game.repository;

import com.lotus.game.entity.ChatChannelReadState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatChannelReadStateRepository extends JpaRepository<ChatChannelReadState, Long> {
    Optional<ChatChannelReadState> findByUserIdAndChannelKey(Long userId, String channelKey);
    List<ChatChannelReadState> findByUserId(Long userId);
}
