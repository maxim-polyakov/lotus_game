package com.lotus.game.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Entity
@Table(name = "minions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Minion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, length = 100)
    private String name;

    @NotNull
    @Min(0)
    @Column(nullable = false)
    private Integer manaCost;

    @Min(0)
    @Column(nullable = false)
    @Builder.Default
    private Integer attack = 0;

    @Min(0)
    @Column(nullable = false)
    @Builder.Default
    private Integer health = 0;

    @Column(length = 500)
    private String description;

    @Column(length = 255)
    private String imageUrl;
}
