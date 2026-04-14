package com.lotus.game.dto.game;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostMatchDropSettingsDto {
    /** Веса (любые неотрицательные числа; вероятность ~ weight / sum(weights)) */
    private int weightGold;
    private int weightDust;
    private int weightCard;
    private int weightHero;

    /** Диапазоны количества (включительно) */
    private int goldMin;
    private int goldMax;
    private int dustMin;
    private int dustMax;
}
