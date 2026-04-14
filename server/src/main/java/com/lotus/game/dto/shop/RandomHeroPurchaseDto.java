package com.lotus.game.dto.shop;

import com.lotus.game.dto.game.HeroDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RandomHeroPurchaseDto {
    private int gold;
    private int randomHeroPrice;
    private int lockedHeroesCount;
    private HeroDto hero;
}
