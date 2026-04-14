package com.lotus.game.dto.shop;

import com.lotus.game.dto.game.CardDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RandomCardPurchaseDto {
    private int gold;
    private int randomCardPrice;
    private int lockedCardsCount;
    private CardDto card;
}
