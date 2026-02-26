package com.lotus.game.service;

import com.lotus.game.dto.game.*;
import com.lotus.game.entity.Deck;
import com.lotus.game.entity.DeckCard;
import com.lotus.game.entity.Match;
import com.lotus.game.entity.Minion;
import com.lotus.game.entity.Spell;
import com.lotus.game.repository.DeckRepository;
import com.lotus.game.repository.MatchRepository;
import com.lotus.game.repository.MinionRepository;
import com.lotus.game.repository.SpellRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class MatchService {

    private static final int STARTING_HEALTH = 30;
    private static final int MAX_MANA = 10;
    private static final int MAX_BOARD_SIZE = 7;
    private static final int MAX_HAND_SIZE = 10;

    private final MatchRepository matchRepository;
    private final DeckRepository deckRepository;
    private final MinionRepository minionRepository;
    private final SpellRepository spellRepository;
    private final MatchBroadcastService broadcastService;

    @Transactional
    public MatchDto findOrCreateMatch(Long userId, Long deckId) {
        Deck deck = deckRepository.findById(deckId)
                .orElseThrow(() -> new IllegalArgumentException("Deck not found: " + deckId));
        if (!deck.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Access denied to deck");
        }

        Optional<Match> waiting = matchRepository.findFirstByStatusOrderByCreatedAtAsc(Match.MatchStatus.WAITING);
        if (waiting.isPresent() && !waiting.get().getPlayer1Id().equals(userId)) {
            Match match = waiting.get();
            match.setPlayer2Id(userId);
            match.setDeck2Id(deckId);
            match.setStatus(Match.MatchStatus.IN_PROGRESS);
            match.setCurrentTurnPlayerId(match.getPlayer1Id());
            match.setGameState(initGameState(match));
            matchRepository.save(match);
            MatchDto dto = MatchDto.from(match);
            broadcastService.broadcastMatchUpdate(match.getId(), dto);
            return dto;
        }

        Match match = Match.builder()
                .player1Id(userId)
                .deck1Id(deckId)
                .status(Match.MatchStatus.WAITING)
                .build();
        match = matchRepository.save(match);
        return MatchDto.from(match);
    }

    @Transactional(readOnly = true)
    public MatchDto getMatch(Long matchId, Long userId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new IllegalArgumentException("Match not found: " + matchId));
        if (!match.getPlayer1Id().equals(userId) && !Objects.equals(match.getPlayer2Id(), userId)) {
            throw new IllegalArgumentException("Access denied");
        }
        return MatchDto.from(match);
    }

    @Transactional(readOnly = true)
    public List<MatchDto> getMyMatches(Long userId) {
        return matchRepository.findByPlayer1IdOrPlayer2IdOrderByCreatedAtDesc(userId, userId).stream()
                .map(MatchDto::from)
                .toList();
    }

    @Transactional
    public MatchDto playCard(Long matchId, Long userId, PlayCardRequest request) {
        Match match = loadMatch(matchId, userId);
        if (match.getStatus() != Match.MatchStatus.IN_PROGRESS) {
            throw new IllegalArgumentException("Match is not in progress");
        }
        if (!match.getCurrentTurnPlayerId().equals(userId)) {
            throw new IllegalArgumentException("Not your turn");
        }

        GameState state = match.getGameState();
        GameState.PlayerState player = getPlayerState(state, userId, match);
        GameState.PlayerState enemy = getEnemyState(state, userId, match);

        GameState.CardInHand cardInHand = player.getHand().stream()
                .filter(c -> c.getInstanceId().equals(request.getInstanceId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Card not in hand"));

        if (!"MINION".equalsIgnoreCase(cardInHand.getCardType())) {
            if ("SPELL".equalsIgnoreCase(cardInHand.getCardType())) {
                Spell spell = spellRepository.findById(cardInHand.getCardId())
                        .orElseThrow(() -> new IllegalArgumentException("Spell not found"));
                if (player.getMana() < spell.getManaCost()) {
                    throw new IllegalArgumentException("Not enough mana");
                }
                player.setMana(player.getMana() - spell.getManaCost());
                player.getHand().removeIf(c -> c.getInstanceId().equals(request.getInstanceId()));
                match.setGameState(state);
                matchRepository.save(match);
                MatchDto dto = MatchDto.from(match);
                broadcastService.broadcastMatchUpdate(matchId, dto);
                return dto;
            }
            throw new IllegalArgumentException("Only minions and spells can be played");
        }

        Minion minion = minionRepository.findById(cardInHand.getCardId())
                .orElseThrow(() -> new IllegalArgumentException("Minion not found"));
        if (player.getMana() < minion.getManaCost()) {
            throw new IllegalArgumentException("Not enough mana");
        }
        if (player.getBoard().size() >= MAX_BOARD_SIZE) {
            throw new IllegalArgumentException("Board is full");
        }
        int pos = request.getTargetPosition() != null ? request.getTargetPosition() : player.getBoard().size();
        if (pos < 0 || pos > player.getBoard().size()) {
            throw new IllegalArgumentException("Invalid board position");
        }

        GameState.BoardMinion boardMinion = GameState.BoardMinion.builder()
                .instanceId(UUID.randomUUID().toString())
                .cardId(minion.getId())
                .attack(minion.getAttack())
                .currentHealth(minion.getHealth())
                .maxHealth(minion.getHealth())
                .canAttack(false)
                .exhausted(true)
                .build();
        player.getBoard().add(pos, boardMinion);
        player.setMana(player.getMana() - minion.getManaCost());
        player.getHand().removeIf(c -> c.getInstanceId().equals(request.getInstanceId()));

        match.setGameState(state);
        matchRepository.save(match);
        MatchDto dto = MatchDto.from(match);
        broadcastService.broadcastMatchUpdate(matchId, dto);
        return dto;
    }

    @Transactional
    public MatchDto attack(Long matchId, Long userId, AttackRequest request) {
        Match match = loadMatch(matchId, userId);
        if (match.getStatus() != Match.MatchStatus.IN_PROGRESS) {
            throw new IllegalArgumentException("Match is not in progress");
        }
        if (!match.getCurrentTurnPlayerId().equals(userId)) {
            throw new IllegalArgumentException("Not your turn");
        }

        GameState state = match.getGameState();
        GameState.PlayerState player = getPlayerState(state, userId, match);
        GameState.PlayerState enemy = getEnemyState(state, userId, match);

        GameState.BoardMinion attacker = player.getBoard().stream()
                .filter(m -> m.getInstanceId().equals(request.getAttackerInstanceId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Attacker not found on board"));
        if (!attacker.isCanAttack()) {
            throw new IllegalArgumentException("Minion cannot attack (exhausted or already attacked)");
        }

        if ("hero".equalsIgnoreCase(request.getTargetInstanceId())) {
            if (!enemy.getBoard().isEmpty()) {
                throw new IllegalArgumentException("Нельзя атаковать героя, пока на столе соперника есть миньоны");
            }
            enemy.setHealth(enemy.getHealth() - attacker.getAttack());
            attacker.setCanAttack(false);
            attacker.setExhausted(true);
            if (enemy.getHealth() <= 0) {
                match.setStatus(Match.MatchStatus.FINISHED);
                match.setWinnerId(userId);
            }
        } else {
            GameState.BoardMinion target = enemy.getBoard().stream()
                    .filter(m -> m.getInstanceId().equals(request.getTargetInstanceId()))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Target not found"));
            target.setCurrentHealth(target.getCurrentHealth() - attacker.getAttack());
            attacker.setCurrentHealth(attacker.getCurrentHealth() - target.getAttack());
            attacker.setCanAttack(false);
            attacker.setExhausted(true);
            if (target.getCurrentHealth() <= 0) {
                enemy.getBoard().remove(target);
            }
            if (attacker.getCurrentHealth() <= 0) {
                player.getBoard().remove(attacker);
            }
        }

        match.setGameState(state);
        matchRepository.save(match);
        MatchDto dto = MatchDto.from(match);
        broadcastService.broadcastMatchUpdate(matchId, dto);
        return dto;
    }

    @Transactional
    public MatchDto endTurn(Long matchId, Long userId) {
        Match match = loadMatch(matchId, userId);
        if (match.getStatus() != Match.MatchStatus.IN_PROGRESS) {
            throw new IllegalArgumentException("Match is not in progress");
        }
        if (!match.getCurrentTurnPlayerId().equals(userId)) {
            throw new IllegalArgumentException("Not your turn");
        }

        GameState state = match.getGameState();
        Long nextPlayer = match.getPlayer1Id().equals(userId) ? match.getPlayer2Id() : match.getPlayer1Id();
        GameState.PlayerState nextState = getPlayerState(state, nextPlayer, match);

        nextState.setMana(Math.min(nextState.getMaxMana() + 1, MAX_MANA));
        nextState.setMaxMana(Math.min(nextState.getMaxMana() + 1, MAX_MANA));
        nextState.getBoard().forEach(m -> m.setCanAttack(true));
        nextState.getBoard().forEach(m -> m.setExhausted(false));

        drawCards(nextState, 1);

        match.setCurrentTurnPlayerId(nextPlayer);
        match.setGameState(state);
        state.setTurnNumber(state.getTurnNumber() + 1);
        state.setCurrentTurnPlayerId(nextPlayer);
        matchRepository.save(match);
        MatchDto dto = MatchDto.from(match);
        broadcastService.broadcastMatchUpdate(matchId, dto);
        return dto;
    }

    private Match loadMatch(Long matchId, Long userId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new IllegalArgumentException("Match not found: " + matchId));
        if (!match.getPlayer1Id().equals(userId) && !match.getPlayer2Id().equals(userId)) {
            throw new IllegalArgumentException("Access denied");
        }
        return match;
    }

    private GameState initGameState(Match match) {
        Deck deck1 = deckRepository.findById(match.getDeck1Id()).orElseThrow();
        Deck deck2 = deckRepository.findById(match.getDeck2Id()).orElseThrow();

        List<GameState.CardRef> deck1Refs = flattenDeck(deck1);
        List<GameState.CardRef> deck2Refs = flattenDeck(deck2);
        Collections.shuffle(deck1Refs);
        Collections.shuffle(deck2Refs);

        GameState.PlayerState p1 = GameState.PlayerState.builder()
                .health(STARTING_HEALTH)
                .mana(1)
                .maxMana(1)
                .deck(deck1Refs)
                .hand(new ArrayList<>())
                .board(new ArrayList<>())
                .build();
        GameState.PlayerState p2 = GameState.PlayerState.builder()
                .health(STARTING_HEALTH)
                .mana(0)
                .maxMana(0)
                .deck(deck2Refs)
                .hand(new ArrayList<>())
                .board(new ArrayList<>())
                .build();

        drawCards(p1, 3);
        drawCards(p2, 4);

        return GameState.builder()
                .player1(p1)
                .player2(p2)
                .turnNumber(1)
                .currentTurnPlayerId(match.getPlayer1Id())
                .build();
    }

    private List<GameState.CardRef> flattenDeck(Deck deck) {
        List<GameState.CardRef> result = new ArrayList<>();
        for (DeckCard dc : deck.getCards()) {
            String type = dc.getMinion() != null ? "MINION" : "SPELL";
            Long id = dc.getMinion() != null ? dc.getMinion().getId() : dc.getSpell().getId();
            for (int i = 0; i < dc.getCount(); i++) {
                result.add(GameState.CardRef.builder().cardType(type).cardId(id).build());
            }
        }
        return result;
    }

    private void drawCards(GameState.PlayerState player, int count) {
        for (int i = 0; i < count && !player.getDeck().isEmpty() && player.getHand().size() < MAX_HAND_SIZE; i++) {
            GameState.CardRef ref = player.getDeck().remove(0);
            GameState.CardInHand inHand = new GameState.CardInHand();
            inHand.setInstanceId(UUID.randomUUID().toString());
            inHand.setCardType(ref.getCardType());
            inHand.setCardId(ref.getCardId());
            player.getHand().add(inHand);
        }
    }

    private GameState.PlayerState getPlayerState(GameState state, Long userId, Match match) {
        return match.getPlayer1Id().equals(userId) ? state.getPlayer1() : state.getPlayer2();
    }

    private GameState.PlayerState getEnemyState(GameState state, Long userId, Match match) {
        return match.getPlayer1Id().equals(userId) ? state.getPlayer2() : state.getPlayer1();
    }
}
