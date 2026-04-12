import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { WS_URL } from '../api/client';
import { getAccessToken } from '../utils/tokenStorage';

const MatchWebSocketContext = createContext(null);

export function MatchWebSocketProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const clientRef = useRef(null);
  const subscriptionsRef = useRef(new Map());

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { token },
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => setConnected(true),
      onDisconnect: () => setConnected(false),
      onStompError: () => setConnected(false),
      onWebSocketError: () => setConnected(false),
      onWebSocketClose: () => setConnected(false),
    });
    clientRef.current = client;
    client.activate();

    return () => {
      client.deactivate();
      clientRef.current = null;
      subscriptionsRef.current.clear();
    };
  }, []);

  const findMatch = useCallback((deckId, mode, heroId) => {
    return new Promise((resolve, reject) => {
      const client = clientRef.current;
      if (!client?.connected) {
        reject(new Error('WebSocket не подключён'));
        return;
      }

      const resultSub = client.subscribe('/user/queue/matches', (msg) => {
        resultSub.unsubscribe();
        errSub.unsubscribe();
        resolve(JSON.parse(msg.body));
      });
      const errSub = client.subscribe('/user/queue/matches/errors', (msg) => {
        resultSub.unsubscribe();
        errSub.unsubscribe();
        const err = JSON.parse(msg.body);
        reject(new Error(err?.error || 'Ошибка'));
      });

      client.publish({
        destination: '/app/matches/find',
        body: JSON.stringify({ deckId, mode: mode || 'RANKED', heroId }),
      });
    });
  }, []);

  const getMatch = useCallback((matchId) => {
    return new Promise((resolve, reject) => {
      const client = clientRef.current;
      if (!client?.connected) {
        reject(new Error('WebSocket не подключён'));
        return;
      }

      const resultSub = client.subscribe('/user/queue/matches', (msg) => {
        resultSub.unsubscribe();
        errSub.unsubscribe();
        resolve(JSON.parse(msg.body));
      });
      const errSub = client.subscribe('/user/queue/matches/errors', (msg) => {
        resultSub.unsubscribe();
        errSub.unsubscribe();
        reject(new Error(JSON.parse(msg.body)?.error || 'Ошибка'));
      });

      client.publish({
        destination: `/app/matches/${matchId}/get`,
        body: JSON.stringify({}),
      });
    });
  }, []);

  const playCard = useCallback((matchId, instanceId, targetPosition, targetInstanceId) => {
    const client = clientRef.current;
    if (!client?.connected) throw new Error('WebSocket не подключён');
    client.publish({
      destination: `/app/matches/${matchId}/play`,
      body: JSON.stringify({ instanceId, targetPosition, targetInstanceId }),
    });
  }, []);

  const attack = useCallback((matchId, attackerInstanceId, targetInstanceId) => {
    const client = clientRef.current;
    if (!client?.connected) throw new Error('WebSocket не подключён');
    client.publish({
      destination: `/app/matches/${matchId}/attack`,
      body: JSON.stringify({ attackerInstanceId, targetInstanceId }),
    });
  }, []);

  const endTurn = useCallback((matchId) => {
    const client = clientRef.current;
    if (!client?.connected) throw new Error('WebSocket не подключён');
    client.publish({
      destination: `/app/matches/${matchId}/end-turn`,
      body: JSON.stringify({}),
    });
  }, []);

  const subscribeToMatch = useCallback((matchId, callback) => {
    const client = clientRef.current;
    if (!client?.connected) return () => {};

    const key = `match-${matchId}`;
    if (subscriptionsRef.current.has(key)) {
      subscriptionsRef.current.get(key).unsubscribe();
    }

    const sub = client.subscribe(`/topic/match/${matchId}`, (msg) => {
      callback(JSON.parse(msg.body));
    });
    subscriptionsRef.current.set(key, sub);

    return () => {
      sub.unsubscribe();
      subscriptionsRef.current.delete(key);
    };
  }, []);

  const subscribeToErrors = useCallback((callback) => {
    const client = clientRef.current;
    if (!client?.connected) return () => {};

    const sub = client.subscribe('/user/queue/matches/errors', (msg) => {
      try {
        const err = JSON.parse(msg.body);
        callback(new Error(err?.error || 'Ошибка'), err?.context);
      } catch {
        callback(new Error('Ошибка'), '');
      }
    });
    return () => sub.unsubscribe();
  }, []);

  const value = {
    connected,
    findMatch,
    getMatch,
    playCard,
    attack,
    endTurn,
    subscribeToMatch,
    subscribeToErrors,
  };

  return (
    <MatchWebSocketContext.Provider value={value}>
      {children}
    </MatchWebSocketContext.Provider>
  );
}

export function useMatchWebSocket() {
  const ctx = useContext(MatchWebSocketContext);
  if (!ctx) throw new Error('useMatchWebSocket must be used within MatchWebSocketProvider');
  return ctx;
}
