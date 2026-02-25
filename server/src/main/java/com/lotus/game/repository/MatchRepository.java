package com.lotus.game.repository;

import com.lotus.game.entity.Match;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MatchRepository extends JpaRepository<Match, Long> {

    Optional<Match> findFirstByStatusOrderByCreatedAtAsc(Match.MatchStatus status);

    List<Match> findByPlayer1IdOrPlayer2IdOrderByCreatedAtDesc(Long player1Id, Long player2Id);
}
