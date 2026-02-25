package com.lotus.game.repository;

import com.lotus.game.entity.Minion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MinionRepository extends JpaRepository<Minion, Long> {

    List<Minion> findAllByOrderByManaCostAscNameAsc();
}
