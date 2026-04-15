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
public class SpecificCardPurchaseDto {
    private int dust;
    private int specificCardDustPrice;
    private int lockedCardsCount;
    private CardDto card;
}
