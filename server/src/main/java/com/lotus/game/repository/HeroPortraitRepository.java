package com.lotus.game.repository;

import com.lotus.game.entity.HeroPortrait;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface HeroPortraitRepository extends JpaRepository<HeroPortrait, String> {
}
