package com.lotus.game.dto.shop;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShopSettingsDto {
    private int randomCardPrice;
    private int specificCardDustPrice;
}
