import Phaser from 'phaser';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import api, { WS_URL } from '../api/client';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../utils/tokenStorage';
import { GAME_WIDTH, GAME_HEIGHT, session } from '../game/shared';
import { escapeAttr } from './ErrorDetail';
import './TutorialModal.css';

export async function loadCurrentUser() {
  const refresh = getRefreshToken();
  const access = getAccessToken();
  if (!refresh && !access) return null;

  try {
    if (refresh) {
      const { data } = await api.post('/api/auth/refresh', { refreshToken: refresh });
      const rememberMe = localStorage.getItem('rememberMe') === 'true';
      setTokens(data.accessToken, data.refreshToken, rememberMe);
    }
    const { data } = await api.get('/api/me');
    session.user = data;
    return data;
  } catch {
    clearTokens();
    session.user = null;
    return null;
  }
}

export async function loginUser(usernameOrEmail, password, rememberMe) {
  const { data } = await api.post('/api/auth/login', { usernameOrEmail, password });
  if (data?.requiresEmailVerification) {
    throw new Error('Email не подтверждён. Откройте экран подтверждения.');
  }
  setTokens(data.accessToken, data.refreshToken, rememberMe);
  const { data: me } = await api.get('/api/me');
  session.user = me;
  return me;
}

const OAUTH_ERROR_MESSAGES = {
  UNREGISTERED_GOOGLE_ACCOUNT: 'Аккаунт не зарегистрирован. Зарегистрируйтесь сначала через форму регистрации.',
  OAUTH_MISSING_DATA: 'Не удалось получить данные от Google.',
  OAUTH_AUTH_ERROR: 'Ошибка авторизации. Попробуйте позже.',
};

/** Read and clear oauth/auth error query params. Returns a user-facing message or ''. */
export function consumeAuthUrlError() {
  const params = new URLSearchParams(window.location.search);
  const oauthError = params.get('oauth_error');
  const oauthErrorType = params.get('oauth_error_type');
  const oauthErrorMsg = params.get('oauth_error_msg');
  const authError = params.get('auth_error');
  if (!oauthError && !authError) return '';

  let msg = '';
  if (oauthError) {
    msg = OAUTH_ERROR_MESSAGES[oauthError];
    if (!msg) {
      try {
        msg = oauthError.startsWith('OAUTH_')
          ? 'Ошибка входа через Google.'
          : decodeURIComponent(oauthError);
      } catch {
        msg = 'Ошибка входа через Google.';
      }
    }
    if (oauthErrorType || oauthErrorMsg) {
      let detailMsg = oauthErrorMsg || '';
      try {
        detailMsg = oauthErrorMsg ? decodeURIComponent(oauthErrorMsg) : '';
      } catch {
        /* use raw */
      }
      const detail = [oauthErrorType, detailMsg].filter(Boolean).join(': ');
      if (detail) msg = `${msg} (${detail})`;
    } else if (oauthError.startsWith('OAUTH_')) {
      msg = `${oauthError}: ${msg}`;
    }
  } else if (authError) {
    msg = authError === 'session_expired' ? 'Сессия истекла. Войдите снова.' : authError;
  }

  const path = window.location.pathname || '/login';
  window.history.replaceState({}, '', path);
  return msg;
}

export async function completeOAuthCallback() {
  const urlError = consumeAuthUrlError();
  if (urlError) {
    throw new Error(urlError);
  }

  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const accessToken = params.get('accessToken');
  const refreshToken = params.get('refreshToken');
  if (params.get('oauth') === 'google' && code) {
    try {
      const { data } = await api.get(`/api/auth/oauth-tokens?code=${encodeURIComponent(code)}`);
      if (!data?.accessToken || !data?.refreshToken) {
        throw new Error('Токены не получены от сервера');
      }
      setTokens(data.accessToken, data.refreshToken, true);
      window.history.replaceState({}, '', '/');
      return loadCurrentUser();
    } catch (err) {
      window.history.replaceState({}, '', '/login');
      throw new Error(err?.response?.data?.message || err?.message || 'Ошибка входа через Google');
    }
  }
  if (accessToken && refreshToken) {
    try {
      setTokens(accessToken, refreshToken, true);
      window.history.replaceState({}, '', '/');
      return loadCurrentUser();
    } catch (err) {
      window.history.replaceState({}, '', '/login');
      throw new Error(err?.message || 'Ошибка входа через Google');
    }
  }
  return null;
}

/**
 * Persistent overlay: listens for /user/queue/friends-online and shows a popup.
 */
export class FriendOnlineScene extends Phaser.Scene {
  constructor() {
    super({ key: 'FriendOnlineScene', active: false });
  }

  create() {
    this._dead = false;
    this.queue = [];
    this.current = null;
    this.shownIds = new Set();
    this.client = null;
    this.dom = null;
    this.events.once('shutdown', () => this.teardown());
    this.events.once('destroy', () => this.teardown());
    if (!session.user?.id) {
      this.scene.stop();
      return;
    }
    this.connect();
  }

  teardown() {
    this._dead = true;
    if (this.client) {
      try { this.client.deactivate(); } catch { /* ignore */ }
      this.client = null;
    }
    this.destroyDom();
  }

  destroyDom() {
    if (this.dom) {
      try { this.dom.destroy(true); } catch { /* ignore */ }
      this.dom = null;
    }
  }

  connect() {
    const token = getAccessToken();
    if (!token) return;
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { token },
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        client.subscribe('/user/queue/friends-online', (msg) => {
          try {
            const payload = JSON.parse(msg.body);
            this.enqueue(payload);
          } catch {
            // ignore bad payloads
          }
        });
      },
    });
    this.client = client;
    client.activate();
  }

  enqueue(payload) {
    if (this._dead || !payload?.id) return;
    if (this.shownIds.has(payload.id)) return;
    if (this.current?.id === payload.id) return;
    if (this.queue.some((n) => n?.id === payload.id)) return;
    this.shownIds.add(payload.id);
    this.queue.push(payload);
    if (payload.id) {
      api.post(`/api/notifications/${payload.id}/read`).catch(() => {});
    }
    this.flush();
  }

  flush() {
    if (this._dead || this.current || !this.queue.length) return;
    this.current = this.queue.shift();
    this.renderPopup();
  }

  dismiss() {
    this.current = null;
    this.destroyDom();
    this.flush();
  }

  renderPopup() {
    this.destroyDom();
    if (!this.current) return;
    const title = escapeAttr(this.current.title || 'Друг в сети');
    const message = escapeAttr(this.current.message || 'Ваш друг вошёл в игру');
    const html = `
      <div class="lotus-modal-overlay" data-friend-dismiss>
        <div class="lotus-modal friend-online-modal" data-friend-card>
          <div class="lotus-modal-header">
            <h2>${title}</h2>
            <button type="button" class="lotus-modal-close" data-friend-dismiss aria-label="Закрыть">×</button>
          </div>
          <div class="lotus-modal-body">
            <p>${message}</p>
            <button type="button" class="lotus-modal-primary" data-friend-dismiss>Ок</button>
          </div>
        </div>
      </div>`;
    this.dom = this.add.dom(GAME_WIDTH / 2, GAME_HEIGHT / 2).createFromHTML(`<div class="phaser-dom-wrap">${html}</div>`);
    this.dom.setOrigin(0.5);
    this.dom.setDepth(2000);
    if (typeof this.dom.updateSize === 'function') this.dom.updateSize();
    const root = this.dom.node;
    root?.querySelectorAll('[data-friend-dismiss]').forEach((el) => {
      el.addEventListener('click', (event) => {
        if (el.hasAttribute('data-friend-card')) return;
        event.preventDefault();
        this.dismiss();
      });
    });
    root?.querySelector('[data-friend-card]')?.addEventListener('click', (e) => e.stopPropagation());
  }
}

export function ensureFriendOnlineScene(scene) {
  if (!session.user?.id || !scene?.scene) return;
  if (scene.scene.isActive('FriendOnlineScene')) return;
  scene.scene.launch('FriendOnlineScene');
}

export function stopFriendOnlineScene(scene) {
  if (!scene?.scene) return;
  if (scene.scene.get('FriendOnlineScene')) scene.scene.stop('FriendOnlineScene');
}

export default FriendOnlineScene;
