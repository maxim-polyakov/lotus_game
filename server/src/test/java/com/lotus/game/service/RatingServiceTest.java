package com.lotus.game.service;

import com.lotus.game.entity.User;
import com.lotus.game.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RatingServiceTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final RatingService ratingService = new RatingService(userRepository);

    @Test
    void equalRatedWinnerGainsAndLoserLosesExpectedElo() {
        User winner = User.builder().id(1L).rating(1000).build();
        User loser = User.builder().id(2L).rating(1000).build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(winner));
        when(userRepository.findById(2L)).thenReturn(Optional.of(loser));

        ratingService.updateRatingsAfterMatch(1L, 2L, 1L);

        assertAll(
                () -> assertEquals(1016, winner.getRating()),
                () -> assertEquals(984, loser.getRating())
        );
        verify(userRepository).save(winner);
        verify(userRepository).save(loser);
    }

    @Test
    void missingPlayerLeavesExistingPlayerUnchanged() {
        User player = User.builder().id(1L).rating(1200).build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(player));
        when(userRepository.findById(2L)).thenReturn(Optional.empty());

        ratingService.updateRatingsAfterMatch(1L, 2L, 1L);

        assertEquals(1200, player.getRating());
        verify(userRepository, never()).save(player);
    }

    @Test
    void rankNamesHonorEveryBoundary() {
        assertAll(
                () -> assertEquals("Новичок", RatingService.getRankName(799)),
                () -> assertEquals("Бронза", RatingService.getRankName(800)),
                () -> assertEquals("Серебро", RatingService.getRankName(1000)),
                () -> assertEquals("Золото", RatingService.getRankName(1200)),
                () -> assertEquals("Платина", RatingService.getRankName(1500)),
                () -> assertEquals("Алмаз", RatingService.getRankName(2000)),
                () -> assertEquals("Мастер", RatingService.getRankName(2500)),
                () -> assertEquals("Легенда", RatingService.getRankName(3000))
        );
    }
}
