package com.lotus.game.repository;

import com.lotus.game.entity.DeckCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DeckCardRepository extends JpaRepository<DeckCard, Long> {

    void deleteByMinionId(Long minionId);

    void deleteBySpellId(Long spellId);
}
