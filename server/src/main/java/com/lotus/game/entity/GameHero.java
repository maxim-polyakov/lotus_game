package com.lotus.game.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "game_heroes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameHero {

    @Id
    @Column(name = "hero_id", length = 64, nullable = false, updatable = false)
    private String id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 180)
    private String title;

    @Column(name = "starting_health", nullable = false)
    private Integer startingHealth;

    @Column(name = "portrait_url", length = 512)
    private String portraitUrl;
}
