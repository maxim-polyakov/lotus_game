import React, { useState, useEffect, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import api from '../api/client';
import { API_BASE } from '../api/client';
import { useAuth } from '../context/AuthContext';
import CardDisplay from './CardDisplay';

export default function GameBoard({ matchId, onExit }) {
  const [match, setMatch] = useState(null);
  const [allCards, setAllCards] = useState([]);
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
    const token = localStorage.getItem('accessToken');
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

  const playCard = async (instanceId, targetPosition) => {
    try {
      await api.post(`/api/matches/${matchId}/play`, { instanceId, targetPosition });
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
    } catch (e) {
      alert(e.response?.data?.message || 'Ошибка');
    }
  };

  const endTurn = async () => {
    try {
      await api.post(`/api/matches/${matchId}/end-turn`);
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
      <div className="game-status">
        {match.status === 'FINISHED' && (
          <p>{match.winnerId === user?.id ? 'Победа!' : 'Поражение'}</p>
        )}
        {match.status === 'IN_PROGRESS' && (
          <p>{isMyTurn ? 'Ваш ход' : 'Ход соперника'}</p>
        )}
      </div>
      <div className="enemy-area">
        <div>Соперник: HP {enemy.health}</div>
        <div className="board">
          {enemy.board?.map((m) => {
            const card = getCard('MINION', m.cardId);
            return card ? (
              <div key={m.instanceId} className="minion enemy-minion">
                <CardDisplay card={{ ...card, attack: m.attack, health: m.currentHealth }} size="sm" />
              </div>
            ) : (
              <div key={m.instanceId} className="minion enemy-minion">{m.attack}/{m.currentHealth}</div>
            );
          })}
        </div>
      </div>
      <div className="my-area">
        <div className="board">
          {me.board?.map((m) => {
            const card = getCard('MINION', m.cardId);
            return card ? (
              <div key={m.instanceId} className="minion my-minion">
                <CardDisplay card={{ ...card, attack: m.attack, health: m.currentHealth }} size="sm" />
                {isMyTurn && m.canAttack && (
                  <button onClick={() => attack(m.instanceId, 'hero')} className="btn btn-primary btn-sm">Атаковать героя</button>
                )}
              </div>
            ) : (
              <div key={m.instanceId} className="minion my-minion">
                {m.attack}/{m.currentHealth}
                {isMyTurn && m.canAttack && (
                  <button onClick={() => attack(m.instanceId, 'hero')} className="btn btn-primary btn-sm">Атаковать героя</button>
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
