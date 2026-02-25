package com.lotus.game.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Entity
@Table(name = "deck_cards")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeckCard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deck_id", nullable = false)
    private Deck deck;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "minion_id")
    private Minion minion;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "spell_id")
    private Spell spell;

    @NotNull
    @Min(1)
    @Column(nullable = false)
    private Integer count;
}
