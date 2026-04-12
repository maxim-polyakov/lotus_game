package com.lotus.game.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "hero_portraits")
@Getter
@Setter
@NoArgsConstructor
public class HeroPortrait {

    @Id
    @Column(name = "hero_id", length = 64, nullable = false)
    private String heroId;

    @Column(name = "image_url", length = 2048)
    private String imageUrl;
}
