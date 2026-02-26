import React, { useState, useEffect, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import api from '../api/client';
import { API_BASE } from '../api/client';
import { getAccessToken } from '../utils/tokenStorage';
import { useAuth } from '../context/AuthContext';
import CardDisplay from './CardDisplay';

export default function GameBoard({ matchId, onExit }) {
  const [match, setMatch] = useState(null);
  const [allCards, setAllCards] = useState([]);
  const [selectedAttacker, setSelectedAttacker] = useState(null);
  const { user } = useAuth();

  const getCard = useCallback((cardType, cardId) => {
    return allCards.find((c) => c.cardType === cardType && c.id === cardId);
  }, [allCards]);

  const loadMatch = useCallback(() => {
    api.get(`/api/matches/${matchId}`).then(({ data }) => setMatch(data));
  }, [matchId]);

  useEffect(() => {
    loadMatch();
  }, [loadMatch]);

  useEffect(() => {
    api.get('/api/cards').then(({ data }) => setAllCards(data || []));
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (!token || !matchId) return;
    const sock = new SockJS(`${API_BASE}/ws`);
    const c = new Client({
      webSocketFactory: () => sock,
      connectHeaders: { token },
      onConnect: () => {
        c.subscribe(`/topic/match/${matchId}`, (msg) => setMatch(JSON.parse(msg.body)));
      },
    });
    c.activate();
    return () => c.deactivate();
  }, [matchId]);

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
      await api.post(`/api/matches/${matchId}/play`, { instanceId, targetPosition });
      const { data } = await api.get(`/api/matches/${matchId}`);
      setMatch(data);
    } catch (e) {
      alert(e.response?.data?.message || 'Ошибка');
    }
  };

  const attack = async (attackerId, targetId) => {
    try {
      await api.post(`/api/matches/${matchId}/attack`, {
        attackerInstanceId: attackerId,
        targetInstanceId: targetId,
      });
      const { data } = await api.get(`/api/matches/${matchId}`);
      setMatch(data);
      setSelectedAttacker(null);
    } catch (e) {
      alert(e.response?.data?.message || 'Ошибка');
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
      alert(e.response?.data?.message || 'Ошибка');
    }
  };

  if (!match) return <div>Загрузка матча...</div>;

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
        <button onClick={onExit} className="btn btn-secondary">Выход</button>
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
            className={`enemy-hero ${selectedAttacker && !enemy.board?.length ? 'attack-target' : ''}`}
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
            return card ? (
              <div
                key={m.instanceId}
                className={`minion enemy-minion ${isTarget ? 'attack-target' : ''}`}
                onClick={() => isTarget && handleTargetClick(m.instanceId)}
                title={isTarget ? `Атаковать (${m.attack}/${m.currentHealth})` : ''}
              >
                <CardDisplay card={{ ...card, attack: m.attack, health: m.currentHealth }} size="sm" />
              </div>
            ) : (
              <div
                key={m.instanceId}
                className={`minion enemy-minion ${isTarget ? 'attack-target' : ''}`}
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
          {me.board?.map((m) => {
            const card = getCard('MINION', m.cardId);
            const canAttack = isMyTurn && m.canAttack;
            const isSelected = selectedAttacker === m.instanceId;
            return card ? (
              <div
                key={m.instanceId}
                className={`minion my-minion ${canAttack ? 'can-attack' : ''} ${isSelected ? 'attacker-selected' : ''}`}
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
                className={`minion my-minion ${canAttack ? 'can-attack' : ''} ${isSelected ? 'attacker-selected' : ''}`}
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
