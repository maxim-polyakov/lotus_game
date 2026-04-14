package com.lotus.game.service;

import com.lotus.game.entity.User;
import com.lotus.game.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    public GoldGrantResult grantGoldToUserByEmailOrUsername(String emailOrUsername, int amount) {
        if (emailOrUsername == null || emailOrUsername.isBlank()) {
            throw new IllegalArgumentException("Введите email или username");
        }
        if (amount <= 0) {
            throw new IllegalArgumentException("Количество золота должно быть больше 0");
        }
        String trimmed = emailOrUsername.trim();
        User user = userRepository.findByUsername(trimmed)
                .or(() -> userRepository.findByEmail(trimmed))
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден: " + trimmed));
        user.setGold(user.getGold() + amount);
        userRepository.save(user);
        return new GoldGrantResult(user.getId(), user.getUsername(), amount, user.getGold());
    }

    public record GoldGrantResult(Long userId, String username, int grantedGold, int totalGold) {}
}
