package com.lotus.game.dto.shop;

import com.lotus.game.dto.game.CardDto;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpecificCardPurchaseRequestDto {
    @NotNull
    private CardDto.CardType cardType;

    @NotNull
    private Long cardId;
}
