package com.lotus.game.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Entity
@Table(name = "minions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Minion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, length = 100)
    private String name;

    @NotNull
    @Min(0)
    @Column(nullable = false)
    private Integer manaCost;

    @Min(0)
    @Column(nullable = false)
    @Builder.Default
    private Integer attack = 0;

    @Min(0)
    @Column(nullable = false)
    @Builder.Default
    private Integer health = 0;

    @Column(length = 500)
    private String description;

    @Column(length = 255)
    private String imageUrl;

    @Column(name = "sound_url", length = 512)
    private String soundUrl;

    @Column(name = "play_effect_url", length = 512)
    private String playEffectUrl;

    @Column(name = "attack_effect_url", length = 512)
    private String attackEffectUrl;

    @Column(name = "attack_sound_url", length = 512)
    private String attackSoundUrl;

    @Column(name = "taunt")
    @Builder.Default
    private boolean taunt = false;

    @Column(name = "charge")
    @Builder.Default
    private boolean charge = false;

    @Column(name = "divine_shield")
    @Builder.Default
    private boolean divineShield = false;

    /** Battlecry: NONE, DEAL_DAMAGE, HEAL, BUFF_ALLY, SUMMON */
    @Column(name = "battlecry_type", length = 20)
    private String battlecryType;

    @Column(name = "battlecry_value")
    private Integer battlecryValue;

    /** For DEAL_DAMAGE: ANY, FRIENDLY, ENEMY */
    @Column(name = "battlecry_target", length = 20)
    private String battlecryTarget;

    @Column(name = "battlecry_summon_card_id")
    private Long battlecrySummonCardId;

    /** Deathrattle: NONE, DEAL_DAMAGE, SUMMON */
    @Column(name = "deathrattle_type", length = 20)
    private String deathrattleType;

    @Column(name = "deathrattle_value")
    private Integer deathrattleValue;

    @Column(name = "deathrattle_summon_card_id")
    private Long deathrattleSummonCardId;
}
