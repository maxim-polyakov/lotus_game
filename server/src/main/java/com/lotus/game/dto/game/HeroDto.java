package com.lotus.game.dto.game;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HeroDto {
    private String id;
    private String name;
    /** Путь к картинке с того же origin, что и клиент; может быть пустым — тогда UIрисует заглушку */
    private String portraitUrl;
    private int startingHealth;
    private String title;
    /** Для обычных игроков: можно ли выбрать в матче */
    @Builder.Default
    private boolean unlocked = true;
    /** Сколько завершённых матчей осталось до следующей разблокировки (только если unlocked=false) */
    private Integer gamesUntilUnlock;
}
