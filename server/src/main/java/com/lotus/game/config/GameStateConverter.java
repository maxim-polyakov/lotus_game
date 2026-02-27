package com.lotus.game.config;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lotus.game.dto.game.GameState;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class GameStateConverter implements AttributeConverter<GameState, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(GameState attribute) {
        if (attribute == null) return null;
        try {
            return MAPPER.writeValueAsString(attribute);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Cannot serialize GameState", e);
        }
    }

    @Override
    public GameState convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) return null;
        try {
            return MAPPER.readValue(dbData, GameState.class);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Cannot deserialize GameState", e);
        }
    }

    public static GameState deepCopy(GameState state) {
        if (state == null) return null;
        try {
            return MAPPER.readValue(MAPPER.writeValueAsString(state), GameState.class);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Cannot copy GameState", e);
        }
    }
}
