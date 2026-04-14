import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useMatchWebSocket } from '../context/MatchWebSocketContext';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { playSound, playSoundFromUrl } from '../utils/sound';
import CardDisplay from './CardDisplay';
import EffectOverlay from './EffectOverlay';
import ErrorDetail from './ErrorDetail';
import ChatWidget from './ChatWidget';

export default function GameBoard({ matchId, initialMatch, onExit, allCards: allCardsProp }) {
  const [match, setMatch] = useState(initialMatch ?? null);
  const [allCardsState, setAllCardsState] = useState([]);
  const allCards = allCardsProp?.length ? allCardsProp : allCardsState;
  const [selectedAttacker, setSelectedAttacker] = useState(null);
  const [selectedSpell, setSelectedSpell] = useState(null);
  const [selectedBattlecry, setSelectedBattlecry] = useState(null);
  const [lastAttackedTargetId, setLastAttackedTargetId] = useState(null);
  const [lastPlayedBoardIndex, setLastPlayedBoardIndex] = useState(null);
  const [effectOverlay, setEffectOverlay] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const { playCard: wsPlayCard, attack: wsAttack, endTurn: wsEndTurn, subscribeToMatch, subscribeToErrors, connected: wsConnected } = useMatchWebSocket();
  const [gameError, setGameError] = useState(null);
  const [gameErrorContext, setGameErrorContext] = useState('');
  const [gameSounds, setGameSounds] = useState({});
  const { user } = useAuth();
  const { soundEnabled, toggleSound } = useSettings();
  const { theme, toggleTheme } = useTheme();

  const getCard = useCallback((cardType, cardId) => {
    return allCards.find((c) => c.cardType === cardType && c.id === cardId);
  }, [allCards]);

  const loadMatch = useCallback(() => {
    setLoadError(null);
    setGameError(null);
    api.get(`/api/matches/${matchId}`)
      .then(({ data }) => {
        setMatch(data);
      })
      .catch((e) => {
        setLoadError(e.response?.data?.message || e.message || 'Не удалось загрузить матч');
        setGameError(e);
        setGameErrorContext('Загрузка матча');
      });
  }, [matchId]);

  useEffect(() => {
    if (initialMatch) setMatch(initialMatch);
    else loadMatch();
  }, [loadMatch, initialMatch]);

  useEffect(() => {
    if (allCardsProp?.length) return;
    api.get('/api/cards')
      .then(({ data }) => setAllCardsState(data || []))
      .catch(() => {});
  }, [matchId, allCardsProp?.length]);

  useEffect(() => {
    api.get('/api/settings/game-sounds')
      .then(({ data }) => setGameSounds(data || {}))
      .catch(() => setGameSounds({}));
  }, []);

  useEffect(() => {
    if (!matchId || !match) return;
    if (match.status !== 'IN_PROGRESS') return;
    if (wsConnected) return;
    const interval = setInterval(loadMatch, 5000);
    return () => clearInterval(interval);
  }, [matchId, match?.status, wsConnected, loadMatch]);

  useEffect(() => {
    if (!matchId) return;
    return subscribeToMatch(matchId, setMatch);
  }, [matchId, subscribeToMatch]);

  useEffect(() => {
    if (!wsConnected) return;
    const unsub = subscribeToErrors((err, context) => {
      setGameError(err);
      setGameErrorContext(context || 'Действие в матче');
      loadMatch();
    });
    return unsub;
  }, [subscribeToErrors, wsConnected]);

  useEffect(() => {
    if (match?.status === 'FINISHED' && soundEnabled) {
      if (match.winnerId === user?.id) {
        gameSounds.victorySoundUrl ? playSoundFromUrl(gameSounds.victorySoundUrl) : playSound('victory');
      } else if (match.winnerId === null) {
        gameSounds.drawSoundUrl ? playSoundFromUrl(gameSounds.drawSoundUrl) : playSound('draw');
      } else {
        gameSounds.defeatSoundUrl ? playSoundFromUrl(gameSounds.defeatSoundUrl) : playSound('defeat');
      }
    }
  }, [match?.status, match?.winnerId, user?.id, soundEnabled, gameSounds.victorySoundUrl, gameSounds.defeatSoundUrl, gameSounds.drawSoundUrl]);

  useEffect(() => {
    if (match?.status === 'FINISHED' && onExit) {
      const t = setTimeout(() => onExit(match), 2500);
      return () => clearTimeout(t);
    }
  }, [match, onExit]);

  useEffect(() => {
    if (match?.gameState && match.currentTurnPlayerId !== user?.id) {
      setSelectedAttacker(null);
      setSelectedSpell(null);
      setSelectedBattlecry(null);
    }
  }, [match?.gameState, match?.currentTurnPlayerId, user?.id]);

  const playCard = async (instanceId, targetPosition, targetInstanceId) => {
    try {
      const cardInHand = me.hand?.find((c) => c.instanceId === instanceId);
      const card = cardInHand ? getCard(cardInHand.cardType, cardInHand.cardId) : null;
      wsPlayCard(matchId, instanceId, targetPosition, targetInstanceId);
      setLastPlayedBoardIndex(targetPosition);
      setTimeout(() => setLastPlayedBoardIndex(null), 450);
      if (soundEnabled) {
        if (card?.soundUrl) playSoundFromUrl(card.soundUrl);
        else playSound('cardPlay');
      }
      if (card?.playEffectUrl) {
        setEffectOverlay({ url: card.playEffectUrl });
        setTimeout(() => setEffectOverlay(null), 2500);
      }
    } catch (e) {
      console.error('playCard error:', e?.message || e);
      setGameError(e);
      setGameErrorContext('Розыгрыш карты');
      loadMatch();
    }
  };

  const attack = async (attackerId, targetId) => {
    try {
      const attackerMinion = me.board?.find((m) => m.instanceId === attackerId);
      const attackerCard = attackerMinion ? getCard('MINION', attackerMinion.cardId) : null;
      wsAttack(matchId, attackerId, targetId);
      setSelectedAttacker(null);
      setLastAttackedTargetId(targetId);
      setTimeout(() => setLastAttackedTargetId(null), 400);
      if (soundEnabled) {
        if (attackerCard?.attackSoundUrl) playSoundFromUrl(attackerCard.attackSoundUrl);
        else playSound('attack');
      }
      if (attackerCard?.attackEffectUrl) {
        setEffectOverlay({ url: attackerCard.attackEffectUrl });
        setTimeout(() => setEffectOverlay(null), 2500);
      }
    } catch (e) {
      console.error('attack error:', e?.message || e);
      setGameError(e);
      setGameErrorContext('Атака');
      loadMatch();
    }
  };

  const handleAttackerClick = (instanceId, canAttack) => {
    if (!isMyTurn || !canAttack) return;
    setSelectedAttacker((prev) => (prev === instanceId ? null : instanceId));
  };

  const handleTargetClick = (targetId) => {
    if (selectedAttacker) {
      attack(selectedAttacker, targetId);
      return;
    }
    if (selectedSpell) {
      playCard(selectedSpell.instanceId, null, targetId);
      setSelectedSpell(null);
      return;
    }
    if (selectedBattlecry) {
      playCard(selectedBattlecry.instanceId, me.board?.length || 0, targetId);
      setSelectedBattlecry(null);
    }
  };

  const endTurn = async () => {
    try {
      wsEndTurn(matchId);
    } catch (e) {
      console.error('endTurn error:', e?.message || e);
      setGameError(e);
      setGameErrorContext('Завершение хода');
      loadMatch();
    }
  };

  if (!match) {
    return (
      <div className="game-board game-board-loading">
        <header>
          <h2>Матч #{matchId}</h2>
          <button onClick={() => onExit?.()} className="btn btn-secondary">Выход</button>
        </header>
        {loadError ? (
          <div className="game-load-error">
            <p>{loadError}</p>
            <button onClick={loadMatch} className="btn btn-primary">Повторить загрузку</button>
          </div>
        ) : (
          <div className="game-loading">Загрузка матча...</div>
        )}
        {gameError && (
          <ErrorDetail err={gameError} context={gameErrorContext} onClose={() => setGameError(null)} />
        )}
      </div>
    );
  }

  const gs = match.gameState;
  if (!gs) return <div>Ожидание начала...</div>;

  const isPlayer1 = match.player1Id === user?.id;
  const me = isPlayer1 ? gs.player1 : gs.player2;
  const enemy = isPlayer1 ? gs.player2 : gs.player1;
  const isMyTurn = match.currentTurnPlayerId === user?.id;
  const attackerMinion = selectedAttacker ? me.board?.find((m) => m.instanceId === selectedAttacker) : null;
  const canAttackHero = !selectedAttacker || (attackerMinion?.canAttackHero !== false);

  return (
    <div className="game-board">
      <header>
        <h2>Матч #{match.id}</h2>
        <div className="header-actions">
          {!wsConnected && (
            <button onClick={loadMatch} className="btn btn-outline btn-sm" title="Соединение потеряно. Нажмите для обновления состояния матча">
              🔄 Обновить
            </button>
          )}
          <button onClick={toggleTheme} className="btn btn-outline btn-sm" title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'} aria-label="Тема">
            {theme === 'dark' ? '☀' : '🌙'}
          </button>
          <button onClick={toggleSound} className="btn btn-outline btn-sm" title={soundEnabled ? 'Выключить звук' : 'Включить звук'} aria-label="Звук">
            {soundEnabled ? '🔊' : '🔇'}
          </button>
          <button onClick={() => onExit?.(match)} className="btn btn-secondary">Выход</button>
        </div>
      </header>
      {effectOverlay && (
        <EffectOverlay url={effectOverlay.url} onClose={() => setEffectOverlay(null)} />
      )}
      {match.status === 'FINISHED' && (
        <div className="game-overlay">
          <div className={`game-overlay-message ${match.winnerId === user?.id ? 'victory' : match.winnerId === null ? 'draw' : 'defeat'}`}>
            {match.winnerId === user?.id ? 'Победа!' : match.winnerId === null ? 'Ничья' : 'Поражение'}
          </div>
          <p className="game-overlay-hint">Через несколько секунд — поиск следующего матча...</p>
          <Link to={`/replay/${match.id}`} className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
            Смотреть реплей
          </Link>
        </div>
      )}
      <div className="game-status">
        {match.status === 'IN_PROGRESS' && (
          <>
            <p>{isMyTurn ? 'Ваш ход' : 'Ход соперника'}</p>
            {selectedAttacker && (
              <p className="attack-hint">
                {attackerMinion?.canAttackHero === false
                  ? 'Rush: выберите миньона соперника (героя атаковать нельзя)'
                  : 'Выберите цель для атаки (миньон или герой соперника)'}
              </p>
            )}
            {selectedSpell && (
              <p className="attack-hint">Выберите цель для заклинания (миньон или герой соперника)</p>
            )}
            {selectedBattlecry?.card?.battlecryType === 'DEAL_DAMAGE' && (
              <p className="attack-hint">Battlecry: выберите цель для урона</p>
            )}
            {selectedBattlecry?.card?.battlecryType === 'HEAL' && (
              <p className="attack-hint">Battlecry: выберите союзника или себя для лечения</p>
            )}
            {selectedBattlecry?.card?.battlecryType === 'BUFF_ALLY' && (
              <p className="attack-hint">Battlecry: выберите союзного миньона для баффа</p>
            )}
          </>
        )}
      </div>
      <div className="enemy-area">
        <div className="enemy-header">
          <div
            className={`enemy-hero ${(selectedAttacker || selectedSpell || selectedBattlecry?.card?.battlecryType === 'DEAL_DAMAGE') && !enemy.board?.length && canAttackHero ? 'attack-target' : ''} ${lastAttackedTargetId === 'hero' ? 'attack-hit' : ''}`}
            onClick={() => (selectedAttacker || selectedSpell || selectedBattlecry?.card?.battlecryType === 'DEAL_DAMAGE') && !enemy.board?.length && canAttackHero && handleTargetClick('hero')}
            title={(selectedAttacker || selectedSpell || selectedBattlecry?.card?.battlecryType === 'DEAL_DAMAGE') && !enemy.board?.length && canAttackHero ? 'Нажмите для атаки/заклинания/Battlecry' : ''}
          >
            <div className={`hero-portrait-sm hero-portrait-sm--${enemy.heroId || 'default'}`}>
              {enemy.portraitUrl ? <img src={enemy.portraitUrl} alt="" /> : <span>{(enemy.heroName || 'С').charAt(0)}</span>}
            </div>
            <div className="enemy-hero-text">
              <span className="enemy-hero-name">{enemy.heroName || 'Соперник'}</span>
              <span className="enemy-hero-hp">HP {enemy.health}{enemy.maxHeroHealth != null ? ` / ${enemy.maxHeroHealth}` : ''}</span>
            </div>
          </div>
        </div>
        <div className="board">
          {enemy.board?.map((m) => {
            const card = getCard('MINION', m.cardId);
            const hasTaunt = enemy.board?.some((b) => b.taunt);
            const isAttack = !!selectedAttacker;
            const canTarget = !m.stealth && (isAttack ? (!hasTaunt || m.taunt) : true);
            const isTarget = !!(selectedAttacker || selectedSpell || selectedBattlecry?.card?.battlecryType === 'DEAL_DAMAGE') && canTarget;
            const justHit = lastAttackedTargetId === m.instanceId;
            return card ? (
              <div
                key={m.instanceId}
                className={`minion enemy-minion ${isTarget ? 'attack-target' : ''} ${justHit ? 'attack-hit' : ''} ${m.stealth ? 'minion-stealth' : ''}`}
                onClick={() => isTarget && handleTargetClick(m.instanceId)}
                title={isTarget ? (selectedSpell ? `Заклинание (${m.attack}/${m.currentHealth})` : `Атаковать (${m.attack}/${m.currentHealth})`) : m.stealth ? 'Stealth: нельзя выбрать' : ''}
              >
                <CardDisplay card={{ ...card, attack: m.attack, health: m.currentHealth, taunt: m.taunt, divineShield: m.divineShield, windfury: m.windfury, stealth: m.stealth, poisonous: m.poisonous, lifesteal: m.lifesteal, rush: m.rush }} size="sm" />
              </div>
            ) : (
              <div
                key={m.instanceId}
                className={`minion enemy-minion ${isTarget ? 'attack-target' : ''} ${justHit ? 'attack-hit' : ''} ${m.stealth ? 'minion-stealth' : ''}`}
                onClick={() => isTarget && handleTargetClick(m.instanceId)}
                title={isTarget ? (selectedSpell ? `Заклинание (${m.attack}/${m.currentHealth})` : `Атаковать (${m.attack}/${m.currentHealth})`) : m.stealth ? 'Stealth' : ''}
              >
                {m.attack}/{m.currentHealth}
              </div>
            );
          })}
        </div>
      </div>
      <div className="my-area">
        <div className="board">
          {me.board?.map((m, idx) => {
            const card = getCard('MINION', m.cardId);
            const canAttack = isMyTurn && m.canAttack;
            const isSelected = selectedAttacker === m.instanceId;
            const justPlayed = lastPlayedBoardIndex === idx;
            const isBattlecryTarget = (selectedBattlecry?.card?.battlecryType === 'HEAL' || selectedBattlecry?.card?.battlecryType === 'BUFF_ALLY');
            const handleMyMinionClick = () => {
              if (isBattlecryTarget) handleTargetClick(m.instanceId);
              else handleAttackerClick(m.instanceId, canAttack);
            };
            return card ? (
              <div
                key={m.instanceId}
                className={`minion my-minion ${canAttack ? 'can-attack' : ''} ${isSelected ? 'attacker-selected' : ''} ${justPlayed ? 'card-just-played' : ''} ${isBattlecryTarget ? 'battlecry-target' : ''}`}
                onClick={handleMyMinionClick}
                title={canAttack ? 'Выберите миньона для атаки, затем цель' : isBattlecryTarget ? 'Выберите для Battlecry' : ''}
              >
                <CardDisplay card={{ ...card, attack: m.attack, health: m.currentHealth, taunt: m.taunt, divineShield: m.divineShield, windfury: m.windfury, stealth: m.stealth, poisonous: m.poisonous, lifesteal: m.lifesteal, rush: m.rush }} size="sm" />
                {canAttack && (
                  <span className="minion-attack-badge">Может атаковать</span>
                )}
              </div>
            ) : (
              <div
                key={m.instanceId}
                className={`minion my-minion ${canAttack ? 'can-attack' : ''} ${isSelected ? 'attacker-selected' : ''} ${justPlayed ? 'card-just-played' : ''} ${isBattlecryTarget ? 'battlecry-target' : ''}`}
                onClick={handleMyMinionClick}
                title={canAttack ? 'Выберите миньона для атаки, затем цель' : isBattlecryTarget ? 'Выберите для Battlecry' : ''}
              >
                {m.attack}/{m.currentHealth}
                {canAttack && (
                  <span className="minion-attack-badge">Может атаковать</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="hand">
          {me.hand?.map((c) => {
            const card = getCard(c.cardType, c.cardId);
            const hasMana = card && me.mana >= (card.manaCost ?? 0);
            const boardFull = (me.board?.length ?? 0) >= 7;
            const spellNeedsTarget = c.cardType === 'SPELL' && card?.damage > 0;
            const battlecryNeedsTarget = c.cardType === 'MINION' && ['DEAL_DAMAGE', 'HEAL', 'BUFF_ALLY'].includes(card?.battlecryType) && (card?.battlecryValue ?? 0) > 0;
            const buffAllyNoTargets = battlecryNeedsTarget && card?.battlecryType === 'BUFF_ALLY' && (me.board?.length ?? 0) === 0;
            const canPlay = isMyTurn && card && hasMana && (c.cardType === 'SPELL' || !boardFull) && !buffAllyNoTargets;
            const playHandler = () => {
              if (c.cardType === 'MINION') {
                setSelectedSpell(null);
                setSelectedAttacker(null);
                if (battlecryNeedsTarget) setSelectedBattlecry({ instanceId: c.instanceId, card });
                else playCard(c.instanceId, me.board?.length || 0);
              } else if (c.cardType === 'SPELL') {
                setSelectedBattlecry(null);
                setSelectedAttacker(null);
                if (spellNeedsTarget) setSelectedSpell({ instanceId: c.instanceId, card });
                else playCard(c.instanceId, null, null);
              }
            };
            return card ? (
              <div key={c.instanceId} className="card-in-hand">
                <CardDisplay card={card} size="sm" />
                {isMyTurn && (c.cardType === 'MINION' || c.cardType === 'SPELL') && (
                  <button
                    onClick={() => {
                      if (selectedSpell?.instanceId === c.instanceId) setSelectedSpell(null);
                      else if (selectedBattlecry?.instanceId === c.instanceId) setSelectedBattlecry(null);
                      else playHandler();
                    }}
                    disabled={!canPlay || (selectedSpell && c.cardType === 'SPELL' && selectedSpell.instanceId !== c.instanceId) || (selectedBattlecry && c.cardType === 'MINION' && selectedBattlecry.instanceId !== c.instanceId)}
                    className={`btn btn-primary btn-sm ${(selectedSpell?.instanceId === c.instanceId || selectedBattlecry?.instanceId === c.instanceId) ? 'btn-secondary' : ''}`}
                  >
                    {c.cardType === 'SPELL'
                      ? (selectedSpell?.instanceId === c.instanceId ? 'Отмена' : spellNeedsTarget ? 'Выбрать цель' : 'Применить')
                      : (selectedBattlecry?.instanceId === c.instanceId ? 'Отмена' : 'Сыграть')}
                  </button>
                )}
              </div>
            ) : (
              <div key={c.instanceId} className="card-in-hand">
                {c.cardType} #{c.cardId}
                {isMyTurn && (c.cardType === 'MINION' || c.cardType === 'SPELL') && (
                  <button onClick={playHandler} disabled={!canPlay} className="btn btn-primary btn-sm">
                    {c.cardType === 'SPELL' ? 'Применить' : 'Сыграть'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="my-hero-row">
          <div className={`hero-portrait-sm hero-portrait-sm--${me.heroId || 'default'}`}>
            {me.portraitUrl ? <img src={me.portraitUrl} alt="" /> : <span>{(me.heroName || 'Я').charAt(0)}</span>}
          </div>
          <span className="my-hero-stats">
            {me.heroName ? `${me.heroName} · ` : ''}Мана: {me.mana} | HP: {me.health}{me.maxHeroHealth != null ? ` / ${me.maxHeroHealth}` : ''} | В колоде: {me.deck?.length ?? 0}
          </span>
          {selectedBattlecry?.card?.battlecryType === 'HEAL' && (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => handleTargetClick('hero')}>
              Лечить себя
            </button>
          )}
        </div>
        {isMyTurn && (
          <button onClick={endTurn} className="btn btn-primary">Завершить ход</button>
        )}
      </div>
      {gameError && (
        <ErrorDetail err={gameError} context={gameErrorContext} onClose={() => setGameError(null)} />
      )}
      <ChatWidget />
    </div>
  );
}
