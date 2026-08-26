import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { WS_URL } from '../api/client';
import { getAccessToken } from '../utils/tokenStorage';

export class MatchSocket {
  constructor() {
    this.client = null;
    this.connectPromise = null;
  }

  connect() {
    const token = getAccessToken();
    if (!token) return Promise.reject(new Error('Нет access token'));
    if (this.client?.connected) return Promise.resolve(this.client);
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = new Promise((resolve, reject) => {
      const client = new Client({
        webSocketFactory: () => new SockJS(WS_URL),
        connectHeaders: { token },
        reconnectDelay: 3000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        onConnect: () => {
          this.client = client;
          this.connectPromise = null;
          resolve(client);
        },
        onStompError: () => {
          this.connectPromise = null;
          reject(new Error('STOMP ошибка'));
        },
        onWebSocketError: () => {
          this.connectPromise = null;
          reject(new Error('WebSocket ошибка'));
        },
      });
      this.client = client;
      client.activate();
    });

    return this.connectPromise;
  }

  disconnect() {
    this.client?.deactivate();
    this.client = null;
    this.connectPromise = null;
  }

  async findMatch(deckId, mode, heroId) {
    const client = await this.connect();
    return new Promise((resolve, reject) => {
      const resultSub = client.subscribe('/user/queue/matches', (msg) => {
        resultSub.unsubscribe();
        errSub.unsubscribe();
        resolve(JSON.parse(msg.body));
      });
      const errSub = client.subscribe('/user/queue/matches/errors', (msg) => {
        resultSub.unsubscribe();
        errSub.unsubscribe();
        const err = JSON.parse(msg.body);
        reject(new Error(err?.error || 'Ошибка поиска матча'));
      });
      client.publish({
        destination: '/app/matches/find',
        body: JSON.stringify({ deckId, mode: mode || 'RANKED', heroId }),
      });
    });
  }

  subscribeMatch(matchId, callback) {
    if (!this.client?.connected) return () => {};
    const sub = this.client.subscribe(`/topic/match/${matchId}`, (msg) => callback(JSON.parse(msg.body)));
    return () => sub.unsubscribe();
  }

  subscribeErrors(callback) {
    if (!this.client?.connected) return () => {};
    const sub = this.client.subscribe('/user/queue/matches/errors', (msg) => {
      const err = JSON.parse(msg.body);
      callback(new Error(err?.error || 'Ошибка матча'), err?.context || '');
    });
    return () => sub.unsubscribe();
  }

  publish(destination, body = {}) {
    if (!this.client?.connected) throw new Error('WebSocket не подключён');
    this.client.publish({ destination, body: JSON.stringify(body) });
  }
}

export const matchSocket = new MatchSocket();
