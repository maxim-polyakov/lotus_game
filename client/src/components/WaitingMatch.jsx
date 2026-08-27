import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { WS_URL } from '../api/client';
import { getAccessToken } from '../utils/tokenStorage';

const CONNECT_TIMEOUT_MS = 6000;
const FIND_MATCH_TIMEOUT_MS = 7000;

function withTimeout(promise, ms, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message || 'Timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export class MatchSocket {
  constructor() {
    this.client = null;
    this.connectPromise = null;
    this.matchListeners = new Map();
    this.errorListeners = new Set();
    this.matchSubs = new Map();
    this.errorSub = null;
  }

  connect() {
    const token = getAccessToken();
    if (!token) return Promise.reject(new Error('Нет access token'));
    if (this.client?.connected) return Promise.resolve(this.client);
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = new Promise((resolve, reject) => {
      let settled = false;
      const finish = (fn, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.connectPromise = null;
        fn(value);
      };

      const timer = setTimeout(() => {
        finish(reject, new Error('WebSocket timeout'));
      }, CONNECT_TIMEOUT_MS);

      const ensureClient = () => {
        if (this.client) return this.client;
        const client = new Client({
          webSocketFactory: () => new SockJS(WS_URL),
          connectHeaders: { token: getAccessToken() || token },
          reconnectDelay: 2500,
          heartbeatIncoming: 10000,
          heartbeatOutgoing: 10000,
          beforeConnect: () => {
            const next = getAccessToken();
            if (next) client.connectHeaders = { token: next };
          },
          onConnect: () => {
            this.client = client;
            this.resubscribeAll();
            finish(resolve, client);
          },
          // Mobile SockJS often errors on websocket probe then falls back to xhr.
          onStompError: () => {},
          onWebSocketError: () => {},
          onDisconnect: () => {
            this.matchSubs.clear();
            this.errorSub = null;
          },
          onWebSocketClose: () => {
            this.matchSubs.clear();
            this.errorSub = null;
          },
        });
        this.client = client;
        client.activate();
        return client;
      };

      const client = ensureClient();
      if (client.connected) {
        finish(resolve, client);
        return;
      }

      // If client already existed and is reconnecting, hook success once.
      const previous = client.onConnect;
      client.onConnect = (frame) => {
        try { previous?.(frame); } catch { /* ignore */ }
        this.resubscribeAll();
        finish(resolve, client);
      };
    });

    return this.connectPromise;
  }

  resubscribeAll() {
    if (!this.client?.connected) return;

    this.matchSubs.forEach((sub) => {
      try { sub.unsubscribe(); } catch { /* ignore */ }
    });
    this.matchSubs.clear();
    if (this.errorSub) {
      try { this.errorSub.unsubscribe(); } catch { /* ignore */ }
      this.errorSub = null;
    }

    this.matchListeners.forEach((listeners, matchId) => {
      if (!listeners.size) return;
      const sub = this.client.subscribe(`/topic/match/${matchId}`, (msg) => {
        let match;
        try {
          match = JSON.parse(msg.body);
        } catch {
          return;
        }
        listeners.forEach((cb) => {
          try { cb(match); } catch { /* ignore */ }
        });
      });
      this.matchSubs.set(matchId, sub);
    });

    if (this.errorListeners.size) {
      this.errorSub = this.client.subscribe('/user/queue/matches/errors', (msg) => {
        let err;
        try {
          err = JSON.parse(msg.body);
        } catch {
          err = { error: 'Ошибка матча' };
        }
        const error = new Error(err?.error || 'Ошибка матча');
        this.errorListeners.forEach((cb) => {
          try { cb(error, err?.context || ''); } catch { /* ignore */ }
        });
      });
    }
  }

  disconnect() {
    this.matchListeners.clear();
    this.errorListeners.clear();
    this.matchSubs.clear();
    this.errorSub = null;
    this.client?.deactivate();
    this.client = null;
    this.connectPromise = null;
  }

  async findMatch(deckId, mode, heroId) {
    const client = await this.connect();
    return withTimeout(new Promise((resolve, reject) => {
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
    }), FIND_MATCH_TIMEOUT_MS, 'Поиск матча по WebSocket не ответил');
  }

  subscribeMatch(matchId, callback) {
    if (!matchId || !callback) return () => {};
    const id = String(matchId);
    if (!this.matchListeners.has(id)) this.matchListeners.set(id, new Set());
    this.matchListeners.get(id).add(callback);

    if (this.client?.connected && !this.matchSubs.has(id)) {
      const listeners = this.matchListeners.get(id);
      const sub = this.client.subscribe(`/topic/match/${id}`, (msg) => {
        let match;
        try {
          match = JSON.parse(msg.body);
        } catch {
          return;
        }
        listeners.forEach((cb) => {
          try { cb(match); } catch { /* ignore */ }
        });
      });
      this.matchSubs.set(id, sub);
    } else if (!this.client?.connected) {
      this.connect().catch(() => {});
    }

    return () => {
      const set = this.matchListeners.get(id);
      if (!set) return;
      set.delete(callback);
      if (set.size === 0) {
        this.matchListeners.delete(id);
        const sub = this.matchSubs.get(id);
        if (sub) {
          try { sub.unsubscribe(); } catch { /* ignore */ }
          this.matchSubs.delete(id);
        }
      }
    };
  }

  subscribeErrors(callback) {
    if (!callback) return () => {};
    this.errorListeners.add(callback);
    if (this.client?.connected) {
      if (!this.errorSub) this.resubscribeAll();
    } else {
      this.connect().catch(() => {});
    }
    return () => {
      this.errorListeners.delete(callback);
      if (!this.errorListeners.size && this.errorSub) {
        try { this.errorSub.unsubscribe(); } catch { /* ignore */ }
        this.errorSub = null;
      }
    };
  }

  publish(destination, body = {}) {
    if (!this.client?.connected) throw new Error('WebSocket не подключён');
    this.client.publish({ destination, body: JSON.stringify(body) });
  }

  get connected() {
    return !!this.client?.connected;
  }
}

export const matchSocket = new MatchSocket();
