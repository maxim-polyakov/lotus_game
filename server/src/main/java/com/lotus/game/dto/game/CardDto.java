package com.lotus.game.dto.game;

import com.lotus.game.entity.Minion;
import com.lotus.game.entity.Spell;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CardDto {

    public enum CardType { MINION, SPELL }

    private Long id;
    private CardType cardType;
    private String name;
    private Integer manaCost;
    private Integer attack;
    private Integer health;
    private String description;
    private String imageUrl;
    private String soundUrl;
    private String playEffectUrl;
    private String attackEffectUrl;
    private Integer damage;
    private String attackSoundUrl;
    private Boolean taunt;
    private Boolean charge;
    private Boolean divineShield;
    private String battlecryType;
    private Integer battlecryValue;
    private String battlecryTarget;
    private Long battlecrySummonCardId;
    private String deathrattleType;
    private Integer deathrattleValue;
    private Long deathrattleSummonCardId;

    public static CardDto fromMinion(Minion m) {
        return CardDto.builder()
                .id(m.getId())
                .cardType(CardType.MINION)
                .name(m.getName())
                .manaCost(m.getManaCost())
                .attack(m.getAttack())
                .health(m.getHealth())
                .description(m.getDescription())
                .imageUrl(m.getImageUrl())
                .soundUrl(m.getSoundUrl())
                .playEffectUrl(m.getPlayEffectUrl())
                .attackEffectUrl(m.getAttackEffectUrl())
                .attackSoundUrl(m.getAttackSoundUrl())
                .taunt(m.getTaunt())
                .charge(m.getCharge())
                .divineShield(m.getDivineShield())
                .battlecryType(m.getBattlecryType())
                .battlecryValue(m.getBattlecryValue())
                .battlecryTarget(m.getBattlecryTarget())
                .battlecrySummonCardId(m.getBattlecrySummonCardId())
                .deathrattleType(m.getDeathrattleType())
                .deathrattleValue(m.getDeathrattleValue())
                .deathrattleSummonCardId(m.getDeathrattleSummonCardId())
                .build();
    }

    public static CardDto fromSpell(Spell s) {
        return CardDto.builder()
                .id(s.getId())
                .cardType(CardType.SPELL)
                .name(s.getName())
                .manaCost(s.getManaCost())
                .attack(0)
                .health(0)
                .description(s.getDescription())
                .imageUrl(s.getImageUrl())
                .soundUrl(s.getSoundUrl())
                .playEffectUrl(s.getPlayEffectUrl())
                .damage(s.getDamage())
                .build();
    }
}
