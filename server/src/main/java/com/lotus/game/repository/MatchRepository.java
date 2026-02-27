package com.lotus.game.repository;

import com.lotus.game.entity.Match;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MatchRepository extends JpaRepository<Match, Long> {

    Optional<Match> findFirstByStatusOrderByCreatedAtAsc(Match.MatchStatus status);

    List<Match> findByStatus(Match.MatchStatus status);

    @Query("SELECT m FROM Match m WHERE m.status = 'WAITING' AND m.matchMode = :mode AND COALESCE(m.player1Rating, 1000) BETWEEN :minRating AND :maxRating")
    List<Match> findWaitingByRatingRangeAndMode(@Param("minRating") int minRating, @Param("maxRating") int maxRating, @Param("mode") Match.MatchMode mode);

    List<Match> findByPlayer1IdOrPlayer2IdOrderByCreatedAtDesc(Long player1Id, Long player2Id);

    @Query("SELECT COUNT(m) FROM Match m WHERE (m.player1Id = :userId OR m.player2Id = :userId) " +
            "AND m.status = 'FINISHED' AND m.winnerId = :userId")
    long countWins(@Param("userId") Long userId);

    @Query("SELECT COUNT(m) FROM Match m WHERE (m.player1Id = :userId OR m.player2Id = :userId) " +
            "AND m.status = 'FINISHED' AND m.winnerId IS NULL")
    long countDraws(@Param("userId") Long userId);

    @Query("SELECT COUNT(m) FROM Match m WHERE (m.player1Id = :userId OR m.player2Id = :userId) " +
            "AND m.status = 'FINISHED' AND m.winnerId IS NOT NULL AND m.winnerId <> :userId")
    long countLosses(@Param("userId") Long userId);
}
