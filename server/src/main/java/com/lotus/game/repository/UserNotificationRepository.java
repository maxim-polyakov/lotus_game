package com.lotus.game.repository;

import com.lotus.game.entity.UserNotification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserNotificationRepository extends JpaRepository<UserNotification, Long> {

    List<UserNotification> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<UserNotification> findByIdAndUserId(Long id, Long userId);

    boolean existsByUserIdAndMatchId(Long userId, Long matchId);

    Optional<UserNotification> findFirstByUserIdAndMatchIdAndReadFalseOrderByCreatedAtDesc(Long userId, Long matchId);
}
