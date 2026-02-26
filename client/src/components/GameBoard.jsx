import React, { useState, useEffect, useCallback } from 'react';
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

export default function GameBoard({ matchId, onExit }) {
  const [match, setMatch] = useState(null);
  const [allCards, setAllCards] = useState([]);
  const [selectedAttacker, setSelectedAttacker] = useState(null);
  const [lastAttackedTargetId, setLastAttackedTargetId] = useState(null);
  const [lastPlayedBoardIndex, setLastPlayedBoardIndex] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [loadError, setLoadError] = useState(null);
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
    api.get('/api/cards')
      .then(({ data }) => setAllCards(data || []))
      .catch(() => {});
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
      if (match.winnerId === user?.id) playSound('victory');
      else if (match.winnerId === null) playSound('draw');
      else playSound('defeat');
    }
  }, [match?.status, match?.winnerId, user?.id, soundEnabled]);

  useEffect(() => {
    if (match?.status === 'FINISHED' && onExit) {
      const t = setTimeout(() => onExit(), 2500);
      return () => clearTimeout(t);
    }
  }, [match?.status, onExit]);

  useEffect(() => {
    if (match?.gameState && match.currentTurnPlayerId !== user?.id) {
      setSelectedAttacker(null);
    }
  }, [match?.gameState, match?.currentTurnPlayerId, user?.id]);

  const playCard = async (instanceId, targetPosition) => {
    try {
      const cardInHand = me.hand?.find((c) => c.instanceId === instanceId);
      const card = cardInHand ? getCard(cardInHand.cardType, cardInHand.cardId) : null;
      await api.post(`/api/matches/${matchId}/play`, { instanceId, targetPosition });
      const { data } = await api.get(`/api/matches/${matchId}`);
      setMatch(data);
      setLastPlayedBoardIndex(targetPosition);
      setTimeout(() => setLastPlayedBoardIndex(null), 450);
      if (soundEnabled) {
        if (card?.soundUrl) playSoundFromUrl(card.soundUrl);
        else playSound('cardPlay');
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
    if (!selectedAttacker) return;
    attack(selectedAttacker, targetId);
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
      {match.status === 'FINISHED' && (
        <div className="game-overlay">
          <div className={`game-overlay-message ${match.winnerId === user?.id ? 'victory' : match.winnerId === null ? 'draw' : 'defeat'}`}>
            {match.winnerId === user?.id ? 'Победа!' : match.winnerId === null ? 'Ничья' : 'Поражение'}
          </div>
          <p className="game-overlay-hint">Через несколько секунд — поиск следующего матча...</p>
        </div>
      )}
      <div className="game-status">
        {match.status === 'IN_PROGRESS' && (
          <>
            <p>{isMyTurn ? 'Ваш ход' : 'Ход соперника'}</p>
            {selectedAttacker && (
              <p className="attack-hint">Выберите цель для атаки (миньон или герой соперника)</p>
            )}
          </>
        )}
      </div>
      <div className="enemy-area">
        <div className="enemy-header">
          <div
            className={`enemy-hero ${selectedAttacker && !enemy.board?.length ? 'attack-target' : ''} ${lastAttackedTargetId === 'hero' ? 'attack-hit' : ''}`}
            onClick={() => selectedAttacker && !enemy.board?.length && handleTargetClick('hero')}
            title={selectedAttacker && !enemy.board?.length ? 'Нажмите, чтобы атаковать героя' : ''}
          >
            Соперник: HP {enemy.health}
          </div>
        </div>
        <div className="board">
          {enemy.board?.map((m) => {
            const card = getCard('MINION', m.cardId);
            const isTarget = !!selectedAttacker;
            const justHit = lastAttackedTargetId === m.instanceId;
            return card ? (
              <div
                key={m.instanceId}
                className={`minion enemy-minion ${isTarget ? 'attack-target' : ''} ${justHit ? 'attack-hit' : ''}`}
                onClick={() => isTarget && handleTargetClick(m.instanceId)}
                title={isTarget ? `Атаковать (${m.attack}/${m.currentHealth})` : ''}
              >
                <CardDisplay card={{ ...card, attack: m.attack, health: m.currentHealth }} size="sm" />
              </div>
            ) : (
              <div
                key={m.instanceId}
                className={`minion enemy-minion ${isTarget ? 'attack-target' : ''} ${justHit ? 'attack-hit' : ''}`}
                onClick={() => isTarget && handleTargetClick(m.instanceId)}
                title={isTarget ? `Атаковать (${m.attack}/${m.currentHealth})` : ''}
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
            return card ? (
              <div
                key={m.instanceId}
                className={`minion my-minion ${canAttack ? 'can-attack' : ''} ${isSelected ? 'attacker-selected' : ''} ${justPlayed ? 'card-just-played' : ''}`}
                onClick={() => handleAttackerClick(m.instanceId, canAttack)}
                title={canAttack ? 'Выберите миньона для атаки, затем цель' : ''}
              >
                <CardDisplay card={{ ...card, attack: m.attack, health: m.currentHealth }} size="sm" />
                {canAttack && (
                  <span className="minion-attack-badge">Может атаковать</span>
                )}
              </div>
            ) : (
              <div
                key={m.instanceId}
                className={`minion my-minion ${canAttack ? 'can-attack' : ''} ${isSelected ? 'attacker-selected' : ''} ${justPlayed ? 'card-just-played' : ''}`}
                onClick={() => handleAttackerClick(m.instanceId, canAttack)}
                title={canAttack ? 'Выберите миньона для атаки, затем цель' : ''}
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
            return card ? (
              <div key={c.instanceId} className="card-in-hand">
                <CardDisplay card={card} size="sm" />
                {isMyTurn && c.cardType === 'MINION' && (
                  <button onClick={() => playCard(c.instanceId, me.board?.length || 0)} className="btn btn-primary btn-sm">Сыграть</button>
                )}
              </div>
            ) : (
              <div key={c.instanceId} className="card-in-hand">
                {c.cardType} #{c.cardId}
                {isMyTurn && c.cardType === 'MINION' && (
                  <button onClick={() => playCard(c.instanceId, me.board?.length || 0)} className="btn btn-primary btn-sm">Сыграть</button>
                )}
              </div>
            );
          })}
        </div>
        <div>Мана: {me.mana} | HP: {me.health}</div>
        {isMyTurn && (
          <button onClick={endTurn} className="btn btn-primary">Завершить ход</button>
        )}
      </div>
    </div>
  );
}
