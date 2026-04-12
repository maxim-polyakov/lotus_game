package com.lotus.game.dto.game;

import com.lotus.game.entity.Deck;
import com.lotus.game.entity.DeckCard;
import com.lotus.game.service.HeroCatalog;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
public class DeckDto {

    private Long id;
    private String name;
    /** id героя из каталога; для старых колод без поля — дефолтный герой */
    private String heroId;
    private List<DeckCardSlotDto> cards;

    public static DeckDto from(Deck deck) {
        List<DeckCardSlotDto> slots = deck.getCards().stream()
                .map(dc -> {
                    DeckCardSlotDto dto = new DeckCardSlotDto();
                    if (dc.getMinion() != null) {
                        dto.setCardType(CardDto.CardType.MINION);
                        dto.setCardId(dc.getMinion().getId());
                    } else {
                        dto.setCardType(CardDto.CardType.SPELL);
                        dto.setCardId(dc.getSpell().getId());
                    }
                    dto.setCount(dc.getCount());
                    return dto;
                })
                .collect(Collectors.toList());
        String hid = deck.getHeroId();
        if (hid == null || hid.isBlank()) {
            hid = HeroCatalog.DEFAULT_HERO_ID;
        }
        return DeckDto.builder()
                .id(deck.getId())
                .name(deck.getName())
                .heroId(hid)
                .cards(slots)
                .build();
    }
}
