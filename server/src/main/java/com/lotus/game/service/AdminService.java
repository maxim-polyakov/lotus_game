package com.lotus.game.service;

import com.lotus.game.entity.User;
import com.lotus.game.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class AdminService {

    private static final String ROLE_ADMIN = "ROLE_ADMIN";

    private final UserRepository userRepository;

    @Transactional
    public void promoteToAdmin(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        if (user.getRoles().add(ROLE_ADMIN)) {
            userRepository.save(user);
        }
    }

    @Transactional
    public void promoteToAdminByEmailOrUsername(String emailOrUsername) {
        if (emailOrUsername == null || emailOrUsername.isBlank()) {
            throw new IllegalArgumentException("Введите email или username");
        }
        String trimmed = emailOrUsername.trim();
        User user = userRepository.findByUsername(trimmed)
                .or(() -> userRepository.findByEmail(trimmed))
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден: " + trimmed));
        if (user.getRoles().add(ROLE_ADMIN)) {
            userRepository.save(user);
        }
    }

    @Transactional
    public RandomGoldGrantResult grantGoldToRandomPlayer(int amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Количество золота должно быть больше 0");
        }
        List<User> players = userRepository.findAll().stream()
                .filter(u -> u.getRoles() == null || !u.getRoles().contains(ROLE_ADMIN))
                .toList();
        if (players.isEmpty()) {
            throw new IllegalArgumentException("Нет доступных игроков для выдачи золота");
        }
        User winner = players.get(ThreadLocalRandom.current().nextInt(players.size()));
        winner.setGold(winner.getGold() + amount);
        userRepository.save(winner);
        return new RandomGoldGrantResult(winner.getId(), winner.getUsername(), amount, winner.getGold());
    }

    public record RandomGoldGrantResult(Long userId, String username, int grantedGold, int totalGold) {}
}
