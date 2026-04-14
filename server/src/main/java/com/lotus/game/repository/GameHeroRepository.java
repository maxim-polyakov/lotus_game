package com.lotus.game.repository;

import com.lotus.game.entity.GameHero;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GameHeroRepository extends JpaRepository<GameHero, String> {
    List<GameHero> findAllByOrderByNameAscIdAsc();
}
