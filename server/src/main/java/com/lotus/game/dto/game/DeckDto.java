package com.lotus.game.dto.game;

import com.lotus.game.entity.Deck;
import com.lotus.game.entity.DeckCard;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
public class DeckDto {

    private Long id;
    private String name;
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
        return DeckDto.builder()
                .id(deck.getId())
                .name(deck.getName())
                .cards(slots)
                .build();
    }
}
