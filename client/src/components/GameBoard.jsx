import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import api from '../api/client';
import { API_BASE } from '../api/client';
import { getAccessToken } from '../utils/tokenStorage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { playSound, playSoundFromUrl } from '../utils/sound';
import CardDisplay from './CardDisplay';
import EffectOverlay from './EffectOverlay';

export default function GameBoard({ matchId, onExit, allCards: allCardsProp }) {
  const [match, setMatch] = useState(null);
  const [allCardsState, setAllCardsState] = useState([]);
  const allCards = allCardsProp?.length ? allCardsProp : allCardsState;
  const [selectedAttacker, setSelectedAttacker] = useState(null);
  const [selectedSpell, setSelectedSpell] = useState(null);
  const [selectedBattlecry, setSelectedBattlecry] = useState(null);
  const [lastAttackedTargetId, setLastAttackedTargetId] = useState(null);
  const [lastPlayedBoardIndex, setLastPlayedBoardIndex] = useState(null);
  const [effectOverlay, setEffectOverlay] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [gameSounds, setGameSounds] = useState({});
  const { user } = useAuth();
  const { soundEnabled, toggleSound } = useSettings();
  const { theme, toggleTheme } = useTheme();

  const getCard = useCallback((cardType, cardId) => {
    return allCards.find((c) => c.cardType === cardType && c.id === cardId);
  }, [allCards]);

  const loadMatch = useCallback(() => {
    setLoadError(null);
    api.get(`/api/matches/${matchId}`)
      .then(({ data }) => {
        setMatch(data);
      })
      .catch((e) => {
        setLoadError(e.response?.data?.message || e.message || 'Не удалось загрузить матч');
      });
  }, [matchId]);

  useEffect(() => {
    loadMatch();
  }, [loadMatch]);

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
    const token = getAccessToken();
    if (!token || !matchId) return;
    const c = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE}/ws`),
      connectHeaders: { token },
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        setWsConnected(true);
        c.subscribe(`/topic/match/${matchId}`, (msg) => setMatch(JSON.parse(msg.body)));
      },
      onDisconnect: () => setWsConnected(false),
      onStompError: () => setWsConnected(false),
      onWebSocketError: () => setWsConnected(false),
      onWebSocketClose: () => setWsConnected(false),
    });
    c.activate();
    return () => c.deactivate();
  }, [matchId]);

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
      const t = setTimeout(() => onExit(), 2500);
      return () => clearTimeout(t);
    }
  }, [match?.status, onExit]);

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
      await api.post(`/api/matches/${matchId}/play`, { instanceId, targetPosition, targetInstanceId });
      const { data } = await api.get(`/api/matches/${matchId}`);
      setMatch(data);
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
      const msg = e.response?.data?.message || 'Ошибка';
      alert(msg);
      loadMatch();
    }
  };

  const attack = async (attackerId, targetId) => {
    try {
      const attackerMinion = me.board?.find((m) => m.instanceId === attackerId);
      const attackerCard = attackerMinion ? getCard('MINION', attackerMinion.cardId) : null;
      await api.post(`/api/matches/${matchId}/attack`, {
        attackerInstanceId: attackerId,
        targetInstanceId: targetId,
      });
      const { data } = await api.get(`/api/matches/${matchId}`);
      setMatch(data);
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
      const msg = e.response?.data?.message || 'Ошибка';
      alert(msg);
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
      await api.post(`/api/matches/${matchId}/end-turn`);
      const { data } = await api.get(`/api/matches/${matchId}`);
      setMatch(data);
    } catch (e) {
      const msg = e.response?.data?.message || 'Ошибка';
      alert(msg);
      loadMatch();
    }
  };

  if (!match) {
    return (
      <div className="game-board game-board-loading">
        <header>
          <h2>Матч #{matchId}</h2>
          <button onClick={onExit} className="btn btn-secondary">Выход</button>
        </header>
        {loadError ? (
          <div className="game-load-error">
            <p>{loadError}</p>
            <button onClick={loadMatch} className="btn btn-primary">Повторить загрузку</button>
          </div>
        ) : (
          <div className="game-loading">Загрузка матча...</div>
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
          <button onClick={onExit} className="btn btn-secondary">Выход</button>
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
              <p className="attack-hint">Выберите цель для атаки (миньон или герой соперника)</p>
            )}
            {selectedSpell && (
              <p className="attack-hint">Выберите цель для заклинания (миньон или герой соперника)</p>
            )}
            {selectedBattlecry?.battlecryType === 'DEAL_DAMAGE' && (
              <p className="attack-hint">Battlecry: выберите цель для урона</p>
            )}
            {selectedBattlecry?.battlecryType === 'HEAL' && (
              <p className="attack-hint">Battlecry: выберите союзника или себя для лечения</p>
            )}
            {selectedBattlecry?.battlecryType === 'BUFF_ALLY' && (
              <p className="attack-hint">Battlecry: выберите союзного миньона для баффа</p>
            )}
          </>
        )}
      </div>
      <div className="enemy-area">
        <div className="enemy-header">
          <div
            className={`enemy-hero ${(selectedAttacker || selectedSpell || selectedBattlecry?.battlecryType === 'DEAL_DAMAGE') && !enemy.board?.length ? 'attack-target' : ''} ${lastAttackedTargetId === 'hero' ? 'attack-hit' : ''}`}
            onClick={() => (selectedAttacker || selectedSpell || selectedBattlecry?.battlecryType === 'DEAL_DAMAGE') && !enemy.board?.length && handleTargetClick('hero')}
            title={(selectedAttacker || selectedSpell || selectedBattlecry?.battlecryType === 'DEAL_DAMAGE') && !enemy.board?.length ? 'Нажмите для атаки/заклинания/Battlecry' : ''}
          >
            Соперник: HP {enemy.health}
          </div>
        </div>
        <div className="board">
          {enemy.board?.map((m) => {
            const card = getCard('MINION', m.cardId);
            const isTarget = !!(selectedAttacker || selectedSpell || selectedBattlecry?.battlecryType === 'DEAL_DAMAGE');
            const justHit = lastAttackedTargetId === m.instanceId;
            return card ? (
              <div
                key={m.instanceId}
                className={`minion enemy-minion ${isTarget ? 'attack-target' : ''} ${justHit ? 'attack-hit' : ''}`}
                onClick={() => isTarget && handleTargetClick(m.instanceId)}
                title={isTarget ? (selectedSpell ? `Заклинание (${m.attack}/${m.currentHealth})` : `Атаковать (${m.attack}/${m.currentHealth})`) : ''}
              >
                <CardDisplay card={{ ...card, attack: m.attack, health: m.currentHealth, taunt: m.taunt, divineShield: m.divineShield }} size="sm" />
              </div>
            ) : (
              <div
                key={m.instanceId}
                className={`minion enemy-minion ${isTarget ? 'attack-target' : ''} ${justHit ? 'attack-hit' : ''}`}
                onClick={() => isTarget && handleTargetClick(m.instanceId)}
                title={isTarget ? (selectedSpell ? `Заклинание (${m.attack}/${m.currentHealth})` : `Атаковать (${m.attack}/${m.currentHealth})`) : ''}
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
            const isBattlecryTarget = (selectedBattlecry?.battlecryType === 'HEAL' || selectedBattlecry?.battlecryType === 'BUFF_ALLY');
            const handleMyMinionClick = () => {
              if (isBattlecryTarget) handleTargetClick(m.instanceId);
              else handleAttackerClick(m.instanceId, canAttack);
            };
            return card ? (
              <div
                key={m.instanceId}
                className={`minion my-minion ${canAttack ? 'can-attack' : ''} ${isSelected ? 'attacker-selected' : ''} ${justPlayed ? 'card-just-played' : ''} ${isBattlecryTarget ? 'attack-target' : ''}`}
                onClick={handleMyMinionClick}
                title={canAttack ? 'Выберите миньона для атаки, затем цель' : isBattlecryTarget ? 'Выберите для Battlecry' : ''}
              >
                <CardDisplay card={{ ...card, attack: m.attack, health: m.currentHealth, taunt: m.taunt, divineShield: m.divineShield }} size="sm" />
                {canAttack && (
                  <span className="minion-attack-badge">Может атаковать</span>
                )}
              </div>
            ) : (
              <div
                key={m.instanceId}
                className={`minion my-minion ${canAttack ? 'can-attack' : ''} ${isSelected ? 'attacker-selected' : ''} ${justPlayed ? 'card-just-played' : ''} ${isBattlecryTarget ? 'attack-target' : ''}`}
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
            const canPlay = isMyTurn && card && hasMana && (c.cardType === 'SPELL' || !boardFull);
            const spellNeedsTarget = c.cardType === 'SPELL' && card?.damage > 0;
            const battlecryNeedsTarget = c.cardType === 'MINION' && ['DEAL_DAMAGE', 'HEAL', 'BUFF_ALLY'].includes(card?.battlecryType);
            const playHandler = () => {
              if (c.cardType === 'MINION') {
                setSelectedSpell(null);
                if (battlecryNeedsTarget) setSelectedBattlecry({ instanceId: c.instanceId, card });
                else playCard(c.instanceId, me.board?.length || 0);
              } else if (c.cardType === 'SPELL') {
                setSelectedBattlecry(null);
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
                      : (selectedBattlecry?.instanceId === c.instanceId ? 'Отмена' : battlecryNeedsTarget ? 'Выбрать цель' : 'Сыграть')}
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
          <span>Мана: {me.mana} | HP: {me.health}</span>
          {selectedBattlecry?.battlecryType === 'HEAL' && (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => handleTargetClick('hero')}>
              Лечить себя
            </button>
          )}
        </div>
        {isMyTurn && (
          <button onClick={endTurn} className="btn btn-primary">Завершить ход</button>
        )}
      </div>
    </div>
  );
}
