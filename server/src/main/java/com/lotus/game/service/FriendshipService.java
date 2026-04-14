package com.lotus.game.service;

import com.lotus.game.dto.friends.FriendRequestDto;
import com.lotus.game.dto.friends.FriendUserDto;
import com.lotus.game.dto.friends.FriendsOverviewDto;
import com.lotus.game.entity.Friendship;
import com.lotus.game.entity.User;
import com.lotus.game.repository.FriendshipRepository;
import com.lotus.game.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FriendshipService {

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public FriendsOverviewDto getOverview(Long userId) {
        List<Friendship> incomingRows = friendshipRepository.findByStatusAndAddresseeIdOrderByCreatedAtDesc(
                Friendship.FriendshipStatus.PENDING, userId
        );
        List<Friendship> outgoingRows = friendshipRepository.findByStatusAndRequesterIdOrderByCreatedAtDesc(
                Friendship.FriendshipStatus.PENDING, userId
        );
        List<Friendship> acceptedRows = friendshipRepository.findAllByStatusAndUser(
                Friendship.FriendshipStatus.ACCEPTED, userId
        );

        Set<Long> ids = new LinkedHashSet<>();
        incomingRows.forEach(r -> ids.add(r.getRequesterId()));
        outgoingRows.forEach(r -> ids.add(r.getAddresseeId()));
        acceptedRows.forEach(r -> ids.add(r.getRequesterId().equals(userId) ? r.getAddresseeId() : r.getRequesterId()));

        Map<Long, User> userMap = userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        List<FriendRequestDto> incoming = incomingRows.stream()
                .map(r -> FriendRequestDto.builder()
                        .requestId(r.getId())
                        .createdAt(r.getCreatedAt() != null ? r.getCreatedAt().toString() : null)
                        .user(toFriendUser(userMap.get(r.getRequesterId())))
                        .build())
                .filter(r -> r.getUser() != null)
                .toList();

        List<FriendRequestDto> outgoing = outgoingRows.stream()
                .map(r -> FriendRequestDto.builder()
                        .requestId(r.getId())
                        .createdAt(r.getCreatedAt() != null ? r.getCreatedAt().toString() : null)
                        .user(toFriendUser(userMap.get(r.getAddresseeId())))
                        .build())
                .filter(r -> r.getUser() != null)
                .toList();

        List<FriendUserDto> friends = acceptedRows.stream()
                .map(r -> r.getRequesterId().equals(userId) ? r.getAddresseeId() : r.getRequesterId())
                .distinct()
                .map(userMap::get)
                .filter(Objects::nonNull)
                .map(this::toFriendUser)
                .toList();

        return FriendsOverviewDto.builder()
                .friends(friends)
                .incoming(incoming)
                .outgoing(outgoing)
                .build();
    }

    @Transactional
    public void sendRequest(Long userId, String targetUsernameRaw) {
        String targetUsername = targetUsernameRaw == null ? "" : targetUsernameRaw.trim();
        if (targetUsername.isEmpty()) {
            throw new IllegalArgumentException("Укажите username");
        }

        User me = userRepository.findById(userId).orElseThrow();
        User target = userRepository.findByUsernameIgnoreCase(targetUsername)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));

        if (Objects.equals(me.getId(), target.getId())) {
            throw new IllegalArgumentException("Нельзя добавить себя в друзья");
        }

        List<Friendship> between = friendshipRepository.findAllBetweenUsers(me.getId(), target.getId());
        for (Friendship f : between) {
            if (f.getStatus() == Friendship.FriendshipStatus.ACCEPTED) {
                throw new IllegalArgumentException("Вы уже друзья");
            }
            if (f.getStatus() == Friendship.FriendshipStatus.PENDING) {
                if (Objects.equals(f.getRequesterId(), me.getId())) {
                    throw new IllegalArgumentException("Приглашение уже отправлено");
                } else {
                    throw new IllegalArgumentException("У вас уже есть входящее приглашение от этого пользователя");
                }
            }
        }

        friendshipRepository.save(Friendship.builder()
                .requesterId(me.getId())
                .addresseeId(target.getId())
                .status(Friendship.FriendshipStatus.PENDING)
                .build());
    }

    @Transactional
    public void acceptRequest(Long userId, Long requestId) {
        Friendship req = friendshipRepository.findByIdAndAddresseeIdAndStatus(
                        requestId, userId, Friendship.FriendshipStatus.PENDING
                )
                .orElseThrow(() -> new IllegalArgumentException("Приглашение не найдено"));
        req.setStatus(Friendship.FriendshipStatus.ACCEPTED);
        req.setRespondedAt(Instant.now());
        friendshipRepository.save(req);
    }

    @Transactional
    public void declineRequest(Long userId, Long requestId) {
        Friendship req = friendshipRepository.findByIdAndAddresseeIdAndStatus(
                        requestId, userId, Friendship.FriendshipStatus.PENDING
                )
                .orElseThrow(() -> new IllegalArgumentException("Приглашение не найдено"));
        req.setStatus(Friendship.FriendshipStatus.DECLINED);
        req.setRespondedAt(Instant.now());
        friendshipRepository.save(req);
    }

    private FriendUserDto toFriendUser(User u) {
        if (u == null) return null;
        return FriendUserDto.builder()
                .id(u.getId())
                .username(u.getUsername())
                .avatarUrl(u.getAvatarUrl())
                .rating(u.getRating())
                .build();
    }
}
