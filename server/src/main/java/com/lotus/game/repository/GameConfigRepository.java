package com.lotus.game.repository;

import com.lotus.game.entity.GameConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GameConfigRepository extends JpaRepository<GameConfig, String> {

    Optional<GameConfig> findByConfigKey(String key);
}
