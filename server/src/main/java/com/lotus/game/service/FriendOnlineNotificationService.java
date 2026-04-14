package com.lotus.game.service;

import com.lotus.game.entity.Friendship;
import com.lotus.game.entity.User;
import com.lotus.game.repository.FriendshipRepository;
import com.lotus.game.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class FriendOnlineNotificationService {

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public void notifyFriendsUserLoggedIn(Long userId) {
        if (userId == null) return;
        User me = userRepository.findById(userId).orElse(null);
        if (me == null) return;

        List<Friendship> acceptedRows = friendshipRepository.findAllByStatusAndUser(
                Friendship.FriendshipStatus.ACCEPTED, userId
        );
        Set<Long> friendIds = new HashSet<>();
        for (Friendship row : acceptedRows) {
            Long friendId = Objects.equals(row.getRequesterId(), userId) ? row.getAddresseeId() : row.getRequesterId();
            if (friendId != null && !Objects.equals(friendId, userId)) {
                friendIds.add(friendId);
            }
        }
        for (Long friendId : friendIds) {
            User friend = userRepository.findById(friendId).orElse(null);
            if (friend == null) continue;
            var dto = notificationService.createFriendOnlineNotification(friendId, me.getUsername());
            messagingTemplate.convertAndSendToUser(friend.getUsername(), "/queue/friends-online", dto);
        }
    }
}
