package com.lotus.game.service;

import com.lotus.game.dto.game.*;
import com.lotus.game.entity.Deck;
import com.lotus.game.entity.DeckCard;
import com.lotus.game.entity.Match;
import com.lotus.game.entity.Minion;
import com.lotus.game.entity.Spell;
import com.lotus.game.config.GameStateConverter;
import com.lotus.game.config.RedisCacheConfig;
import com.lotus.game.repository.DeckRepository;
import com.lotus.game.repository.MatchRepository;
import com.lotus.game.repository.UserRepository;
import com.lotus.game.repository.MinionRepository;
import com.lotus.game.repository.SpellRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class MatchService {

    private static final int STARTING_HEALTH = 30;
    private static final int MAX_MANA = 10;
    private static final int MAX_BOARD_SIZE = 7;
    private static final int MAX_HAND_SIZE = 10;
    private static final int MATCHMAKING_RATING_RANGE = 200;

    private final MatchRepository matchRepository;
    private final DeckRepository deckRepository;
    private final UserRepository userRepository;
    private final RatingService ratingService;
    private final MinionRepository minionRepository;
    private final SpellRepository spellRepository;
    private final MatchBroadcastService broadcastService;
    private final CacheManager cacheManager;

    @Transactional
    public MatchDto findOrCreateMatch(Long userId, Long deckId, Match.MatchMode mode) {
        Deck deck = deckRepository.findById(deckId)
                .orElseThrow(() -> new IllegalArgumentException("Deck not found: " + deckId));
        if (!deck.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Access denied to deck");
        }

        int myRating = userRepository.findById(userId)
                .map(u -> u.getRating())
                .orElse(1000);
        int minRating = mode == Match.MatchMode.CASUAL ? 0 : Math.max(0, myRating - MATCHMAKING_RATING_RANGE);
        int maxRating = mode == Match.MatchMode.CASUAL ? 9999 : myRating + MATCHMAKING_RATING_RANGE;

        List<Match> waitingList = matchRepository.findWaitingByRatingRangeAndMode(minRating, maxRating, mode).stream()
                .filter(m -> !m.getPlayer1Id().equals(userId))
                .toList();
        if (!waitingList.isEmpty()) {
            Match match = waitingList.get(ThreadLocalRandom.current().nextInt(waitingList.size()));
            match.setPlayer2Id(userId);
            match.setDeck2Id(deckId);
            match.setPlayer2Rating(myRating);
            match.setStatus(Match.MatchStatus.IN_PROGRESS);
            match.setCurrentTurnPlayerId(match.getPlayer1Id());
            match.setGameState(initGameState(match));
            addReplayStep(match, "INIT", null, "Match started", match.getGameState());
            matchRepository.save(match);
            evictMatchCacheForPlayers(match);
            MatchDto dto = MatchDto.from(match);
            broadcastService.broadcastMatchUpdate(match.getId(), dto);
            return dto;
        }

        Match match = Match.builder()
                .player1Id(userId)
                .deck1Id(deckId)
                .player1Rating(myRating)
                .matchMode(mode)
                .status(Match.MatchStatus.WAITING)
                .build();
        match = matchRepository.save(match);
        return MatchDto.from(match);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = RedisCacheConfig.CACHE_MATCHES, key = "#matchId + '_' + #userId")
    public MatchDto getMatch(Long matchId, Long userId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new IllegalArgumentException("Match not found: " + matchId));
        if (!match.getPlayer1Id().equals(userId) && !Objects.equals(match.getPlayer2Id(), userId)) {
            throw new IllegalArgumentException("Access denied");
        }
        return MatchDto.from(match);
    }

    @Transactional(readOnly = true)
    public List<ReplayStepDto> getReplay(Long matchId, Long userId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new IllegalArgumentException("Match not found: " + matchId));
        if (!match.getPlayer1Id().equals(userId) && !Objects.equals(match.getPlayer2Id(), userId)) {
            throw new IllegalArgumentException("Access denied");
        }
        List<ReplayStepDto> steps = match.getReplaySteps();
        return steps != null ? steps : List.of();
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
                int dmg = spell.getDamage() != null ? spell.getDamage() : 0;
                if (dmg > 0) {
                    if (request.getTargetInstanceId() == null || request.getTargetInstanceId().isBlank()) {
                        throw new IllegalArgumentException("Укажите цель для заклинания (миньон или герой соперника)");
                    }
                    if ("hero".equalsIgnoreCase(request.getTargetInstanceId())) {
                        boolean hasTaunt = enemy.getBoard().stream().anyMatch(GameState.BoardMinion::isTaunt);
                        if (hasTaunt) {
                            throw new IllegalArgumentException("Нельзя атаковать героя, пока на столе соперника есть миньон с Провокацией (Taunt)");
                        }
                        enemy.setHealth(enemy.getHealth() - dmg);
                        if (enemy.getHealth() <= 0) {
                            match.setStatus(Match.MatchStatus.FINISHED);
                            match.setWinnerId(userId);
                        }
                    } else {
                        GameState.BoardMinion target = enemy.getBoard().stream()
                                .filter(m -> m.getInstanceId().equals(request.getTargetInstanceId()))
                                .findFirst()
                                .orElseThrow(() -> new IllegalArgumentException("Цель не найдена"));
                        if (target.isDivineShield()) {
                            target.setDivineShield(false);
                        } else {
                            target.setCurrentHealth(target.getCurrentHealth() - dmg);
                            if (target.getCurrentHealth() <= 0) {
                                enemy.getBoard().remove(target);
                            }
                        }
                    }
                }
                player.setMana(player.getMana() - spell.getManaCost());
                player.getHand().removeIf(c -> c.getInstanceId().equals(request.getInstanceId()));
                match.setGameState(state);
                addReplayStep(match, "PLAY", userId, "Spell: " + spell.getName(), state);
                matchRepository.save(match);
                applyRatingUpdateIfFinished(match);
                evictMatchCacheForPlayers(match);
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

        boolean canAttackNow = Boolean.TRUE.equals(minion.getCharge());
        GameState.BoardMinion boardMinion = GameState.BoardMinion.builder()
                .instanceId(UUID.randomUUID().toString())
                .cardId(minion.getId())
                .attack(minion.getAttack())
                .currentHealth(minion.getHealth())
                .maxHealth(minion.getHealth())
                .canAttack(canAttackNow)
                .exhausted(!canAttackNow)
                .taunt(Boolean.TRUE.equals(minion.getTaunt()))
                .divineShield(Boolean.TRUE.equals(minion.getDivineShield()))
                .build();
        player.getBoard().add(pos, boardMinion);
        player.setMana(player.getMana() - minion.getManaCost());
        player.getHand().removeIf(c -> c.getInstanceId().equals(request.getInstanceId()));

        match.setGameState(state);
        addReplayStep(match, "PLAY", userId, "Minion: " + minion.getName(), state);
        matchRepository.save(match);
        evictMatchCacheForPlayers(match);
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
            boolean hasTaunt = enemy.getBoard().stream().anyMatch(GameState.BoardMinion::isTaunt);
            if (hasTaunt) {
                throw new IllegalArgumentException("Нельзя атаковать героя, пока на столе соперника есть миньон с Провокацией (Taunt)");
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
            if (target.isDivineShield()) {
                target.setDivineShield(false);
            } else {
                target.setCurrentHealth(target.getCurrentHealth() - attacker.getAttack());
            }
            if (attacker.isDivineShield()) {
                attacker.setDivineShield(false);
            } else {
                attacker.setCurrentHealth(attacker.getCurrentHealth() - target.getAttack());
            }
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
        addReplayStep(match, "ATTACK", userId, "Attack " + request.getAttackerInstanceId() + " -> " + request.getTargetInstanceId(), state);
        matchRepository.save(match);
        applyRatingUpdateIfFinished(match);
        evictMatchCacheForPlayers(match);
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

        int cardsToDraw = ThreadLocalRandom.current().nextInt(1, 4);
        boolean diedFromFatigue = drawCardsWithFatigue(nextState, cardsToDraw);
        if (diedFromFatigue) {
            match.setStatus(Match.MatchStatus.FINISHED);
            match.setWinnerId(userId);
        } else {
            boolean bothDecksEmpty = state.getPlayer1().getDeck().isEmpty() && state.getPlayer2().getDeck().isEmpty();
            boolean bothBoardsEmpty = state.getPlayer1().getBoard().isEmpty() && state.getPlayer2().getBoard().isEmpty();
            if (bothDecksEmpty && bothBoardsEmpty) {
                match.setStatus(Match.MatchStatus.FINISHED);
                int p1Hp = state.getPlayer1().getHealth();
                int p2Hp = state.getPlayer2().getHealth();
                match.setWinnerId(p1Hp > p2Hp ? match.getPlayer1Id() : p2Hp > p1Hp ? match.getPlayer2Id() : null);
            } else {
                match.setCurrentTurnPlayerId(nextPlayer);
                state.setTurnNumber(state.getTurnNumber() + 1);
                state.setCurrentTurnPlayerId(nextPlayer);
            }
        }
        match.setGameState(state);
        addReplayStep(match, "END_TURN", userId, "End turn", state);
        matchRepository.save(match);
        applyRatingUpdateIfFinished(match);
        evictMatchCacheForPlayers(match);
        MatchDto dto = MatchDto.from(match);
        broadcastService.broadcastMatchUpdate(matchId, dto);
        return dto;
    }

    private void applyRatingUpdateIfFinished(Match match) {
        if (match.getStatus() == Match.MatchStatus.FINISHED && match.getPlayer2Id() != null
                && match.getMatchMode() == Match.MatchMode.RANKED) {
            ratingService.updateRatingsAfterMatch(
                    match.getPlayer1Id(),
                    match.getPlayer2Id(),
                    match.getWinnerId()
            );
        }
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

    /**
     * Розыгрыш карт с учётом урона от усталости (fatigue).
     * Когда колода пуста и игрок должен взять карту — он получает урон (1, 2, 3... за каждую «пропущенную» карту).
     * @return true если игрок умер от усталости
     */
    private boolean drawCardsWithFatigue(GameState.PlayerState player, int count) {
        for (int i = 0; i < count && player.getHand().size() < MAX_HAND_SIZE; i++) {
            if (player.getDeck().isEmpty()) {
                int fatigue = player.getFatigueCounter() + 1;
                player.setFatigueCounter(fatigue);
                player.setHealth(player.getHealth() - fatigue);
                if (player.getHealth() <= 0) return true;
            } else {
                GameState.CardRef ref = player.getDeck().remove(0);
                GameState.CardInHand inHand = new GameState.CardInHand();
                inHand.setInstanceId(UUID.randomUUID().toString());
                inHand.setCardType(ref.getCardType());
                inHand.setCardId(ref.getCardId());
                player.getHand().add(inHand);
            }
        }
        return false;
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

    private void addReplayStep(Match match, String actionType, Long playerId, String description, GameState stateAfter) {
        List<ReplayStepDto> steps = match.getReplaySteps();
        if (steps == null) steps = new ArrayList<>();
        int idx = steps.size();
        int turn = stateAfter != null ? stateAfter.getTurnNumber() : 1;
        ReplayStepDto step = ReplayStepDto.builder()
                .stepIndex(idx)
                .turnNumber(turn)
                .actionType(actionType)
                .playerId(playerId)
                .description(description)
                .gameState(stateAfter != null ? GameStateConverter.deepCopy(stateAfter) : null)
                .build();
        steps.add(step);
        match.setReplaySteps(steps);
    }

    private void evictMatchCacheForPlayers(Match match) {
        var cache = cacheManager.getCache(RedisCacheConfig.CACHE_MATCHES);
        if (cache != null) {
            cache.evict(match.getId() + "_" + match.getPlayer1Id());
            if (match.getPlayer2Id() != null) {
                cache.evict(match.getId() + "_" + match.getPlayer2Id());
            }
        }
    }
}
