package com.lotus.game.service;

import com.lotus.game.entity.User;
import com.lotus.game.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * ELO рейтинговая система. K-factor = 32 для новых игроков, 16 для рейтинга >= 2000.
 */
@Service
@RequiredArgsConstructor
public class RatingService {

    private static final int K_FACTOR_HIGH = 32;
    private static final int K_FACTOR_LOW = 16;
    private static final int RATING_THRESHOLD = 2000;

    private final UserRepository userRepository;

    /**
     * Обновляет рейтинги обоих игроков после завершения матча.
     * @param winnerId id победителя, null при ничьей
     */
    @Transactional
    public void updateRatingsAfterMatch(Long player1Id, Long player2Id, Long winnerId) {
        User p1 = userRepository.findById(player1Id).orElse(null);
        User p2 = userRepository.findById(player2Id).orElse(null);
        if (p1 == null || p2 == null) return;

        int r1 = p1.getRating();
        int r2 = p2.getRating();

        double e1 = expectedScore(r1, r2);
        double e2 = expectedScore(r2, r1);

        double s1, s2;
        if (winnerId == null) {
            s1 = 0.5;
            s2 = 0.5;
        } else if (winnerId.equals(player1Id)) {
            s1 = 1.0;
            s2 = 0.0;
        } else {
            s1 = 0.0;
            s2 = 1.0;
        }

        int k1 = r1 >= RATING_THRESHOLD ? K_FACTOR_LOW : K_FACTOR_HIGH;
        int k2 = r2 >= RATING_THRESHOLD ? K_FACTOR_LOW : K_FACTOR_HIGH;

        int delta1 = (int) Math.round(k1 * (s1 - e1));
        int delta2 = (int) Math.round(k2 * (s2 - e2));

        p1.setRating(Math.max(0, r1 + delta1));
        p2.setRating(Math.max(0, r2 + delta2));
        userRepository.save(p1);
        userRepository.save(p2);
    }

    private double expectedScore(int ratingA, int ratingB) {
        return 1.0 / (1.0 + Math.pow(10, (ratingB - ratingA) / 400.0));
    }

    /**
     * Возвращает название ранга по рейтингу.
     */
    public static String getRankName(int rating) {
        if (rating >= 3000) return "Легенда";
        if (rating >= 2500) return "Мастер";
        if (rating >= 2000) return "Алмаз";
        if (rating >= 1500) return "Платина";
        if (rating >= 1200) return "Золото";
        if (rating >= 1000) return "Серебро";
        if (rating >= 800) return "Бронза";
        return "Новичок";
    }
}
