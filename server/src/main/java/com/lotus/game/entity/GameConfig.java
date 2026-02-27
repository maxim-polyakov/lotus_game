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
    @Column(name = "config_key", length = 50)
    private String configKey;

    @Column(name = "config_value", length = 512)
    private String configValue;
}
