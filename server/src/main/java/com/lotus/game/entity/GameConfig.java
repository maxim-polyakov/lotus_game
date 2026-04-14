package com.lotus.game.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "game_config")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameConfig {

    @Id
    @Column(name = "config_key", length = 120)
    private String configKey;

    @Column(name = "config_value", length = 8000)
    private String configValue;
}
