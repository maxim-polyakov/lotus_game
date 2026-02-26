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
    private String animationUrl;

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
                .animationUrl(m.getAnimationUrl())
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
                .animationUrl(s.getAnimationUrl())
                .build();
    }
}
