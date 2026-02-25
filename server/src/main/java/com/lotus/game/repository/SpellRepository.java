package com.lotus.game.repository;

import com.lotus.game.entity.Spell;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SpellRepository extends JpaRepository<Spell, Long> {

    List<Spell> findAllByOrderByManaCostAscNameAsc();
}
