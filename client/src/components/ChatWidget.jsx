import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import Phaser from 'phaser';
import api, { WS_URL } from '../api/client';
import { getAccessToken } from '../utils/tokenStorage';
import { GAME_WIDTH, GAME_HEIGHT, palette, session, layoutInfo } from '../game/shared';
import { escapeAttr } from './ErrorDetail';
import './ChatWidget.css';

function privateKey(a, b) {
  const x = (a || '').trim().toLowerCase();
  const y = (b || '').trim().toLowerCase();
  return x <= y ? `private:${x}:${y}` : `private:${y}:${x}`;
}

function resolvePrivatePeer(myUsername, channelKey) {
  if (!channelKey || !channelKey.startsWith('private:')) return null;
  const parts = channelKey.split(':');
  if (parts.length !== 3) return null;
  const me = (myUsername || '').trim().toLowerCase();
  if (parts[1] === me) return parts[2];
  if (parts[2] === me) return parts[1];
  return null;
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function initials(username) {
  const value = (username || '').trim();
  if (!value) return '?';
  return value.slice(0, 2).toUpperCase();
}

/**
 * Persistent Phaser overlay scene for Lotus Chat (general / private / match).
 * Launched in parallel with menu/match scenes; must survive other scenes' clearScene.
 */
export class ChatScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ChatScene', active: false });
  }

  create() {
    this._dead = false;
    this.collapsed = true;
    this.connected = false;
    this.activeTab = 'GENERAL';
    this.privatePeer = '';
    this.privateInput = '';
    this.privateDialogs = [];
    this.activeMatchId = null;
    this.messagesByKey = {};
    this.unreadByKey = {};
    this.error = '';
    this.client = null;
    this.matchSub = null;
    this.matchPoll = null;
    this.dom = null;
    this.dragX = null;
    this.dragY = null;
    this.sizeW = 360;
    this.sizeH = 420;
    this._dragCleanup = null;
    this._resizeCleanup = null;

    this.events.once('shutdown', () => this.teardown());
    this.events.once('destroy', () => this.teardown());

    if (!session.user?.id) {
      this.scene.stop();
      return;
    }

    this.connectSocket();
    this.loadBootstrap();
    this.renderUi();
  }

  teardown() {
    this._dead = true;
    if (this.matchPoll) {
      clearInterval(this.matchPoll);
      this.matchPoll = null;
    }
    if (this.matchSub) {
      try { this.matchSub.unsubscribe(); } catch { /* ignore */ }
      this.matchSub = null;
    }
    if (this.client) {
      try { this.client.deactivate(); } catch { /* ignore */ }
      this.client = null;
    }
    this.destroyDom();
  }

  destroyDom() {
    if (this._dragCleanup) {
      try { this._dragCleanup(); } catch { /* ignore */ }
      this._dragCleanup = null;
    }
    if (this._resizeCleanup) {
      try { this._resizeCleanup(); } catch { /* ignore */ }
      this._resizeCleanup = null;
    }
    if (this.dom) {
      try {
        this.dom.destroy(true);
      } catch { /* ignore */ }
      this.dom = null;
    }
  }

  pointerToGame(clientX, clientY) {
    const canvas = this.sys?.game?.canvas;
    if (!canvas) return { x: clientX, y: clientY };
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return { x: clientX, y: clientY };
    return {
      x: ((clientX - rect.left) / rect.width) * GAME_WIDTH,
      y: ((clientY - rect.top) / rect.height) * GAME_HEIGHT,
    };
  }

  clampPos(x, y) {
    const margin = this.collapsed ? 50 : 120;
    return {
      x: Math.min(GAME_WIDTH - margin, Math.max(margin, x)),
      y: Math.min(GAME_HEIGHT - margin, Math.max(margin, y)),
    };
  }

  defaultPanel() {
    const layout = layoutInfo();
    if (this.collapsed) {
      return {
        x: layout.portrait ? GAME_WIDTH - 110 : GAME_WIDTH - 120,
        y: layout.portrait ? GAME_HEIGHT - 70 : GAME_HEIGHT - 60,
      };
    }
    return {
      x: layout.portrait ? GAME_WIDTH / 2 : GAME_WIDTH - 210,
      y: layout.portrait ? GAME_HEIGHT - 340 : GAME_HEIGHT - 300,
    };
  }

  panelPosition() {
    if (this.dragX != null && this.dragY != null) {
      return this.clampPos(this.dragX, this.dragY);
    }
    return this.defaultPanel();
  }

  bindDrag(root) {
    const handle = root.querySelector('[data-chat-drag]');
    if (!handle || !this.dom) return;

    let dragging = false;
    let moved = false;
    let offsetX = 0;
    let offsetY = 0;
    let startClientX = 0;
    let startClientY = 0;

    const onDown = (event) => {
      if (event.button != null && event.button !== 0) return;
      if (event.target.closest('[data-chat-collapse], [data-chat-resize], input, textarea, select, a, [data-chat-tab], [data-open-private], [data-open-dialog], .chat-widget-send button')) {
        return;
      }
      const pt = this.pointerToGame(event.clientX, event.clientY);
      dragging = true;
      moved = false;
      startClientX = event.clientX;
      startClientY = event.clientY;
      offsetX = this.dom.x - pt.x;
      offsetY = this.dom.y - pt.y;
      handle.classList.add('is-dragging');
      try { handle.setPointerCapture?.(event.pointerId); } catch { /* ignore */ }
      event.preventDefault();
    };

    const onMove = (event) => {
      if (!dragging || !this.dom || this._dead) return;
      if (Math.abs(event.clientX - startClientX) + Math.abs(event.clientY - startClientY) > 4) {
        moved = true;
      }
      const pt = this.pointerToGame(event.clientX, event.clientY);
      const next = this.clampPos(pt.x + offsetX, pt.y + offsetY);
      this.dom.x = next.x;
      this.dom.y = next.y;
      this.dragX = next.x;
      this.dragY = next.y;
    };

    const onUp = (event) => {
      if (!dragging) return;
      dragging = false;
      handle.classList.remove('is-dragging');
      try { handle.releasePointerCapture?.(event.pointerId); } catch { /* ignore */ }
      // Prevent accidental expand/collapse after a drag gesture.
      if (moved) {
        const blockClick = (clickEvent) => {
          clickEvent.stopPropagation();
          clickEvent.preventDefault();
        };
        handle.addEventListener('click', blockClick, { capture: true, once: true });
      }
    };

    handle.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    this._dragCleanup = () => {
      handle.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      handle.classList.remove('is-dragging');
    };
  }

  clampSize(width, height) {
    const maxW = Math.min(620, GAME_WIDTH - 24);
    const maxH = Math.min(720, GAME_HEIGHT - 24);
    return {
      width: Math.min(maxW, Math.max(280, width)),
      height: Math.min(maxH, Math.max(300, height)),
    };
  }

  bindResize(root) {
    const handle = root.querySelector('[data-chat-resize]');
    const widget = root.querySelector('.chat-widget--phaser:not(.chat-widget--collapsed)');
    if (!handle || !widget || !this.dom) return;

    let resizing = false;
    let startClientX = 0;
    let startClientY = 0;
    let startW = 0;
    let startH = 0;
    let left = 0;
    let top = 0;

    const onDown = (event) => {
      if (event.button != null && event.button !== 0) return;
      resizing = true;
      startClientX = event.clientX;
      startClientY = event.clientY;
      startW = this.sizeW;
      startH = this.sizeH;
      left = this.dom.x - this.sizeW / 2;
      top = this.dom.y - this.sizeH / 2;
      handle.classList.add('is-resizing');
      try { handle.setPointerCapture?.(event.pointerId); } catch { /* ignore */ }
      event.preventDefault();
      event.stopPropagation();
    };

    const onMove = (event) => {
      if (!resizing || !this.dom || this._dead) return;
      const canvas = this.sys?.game?.canvas;
      const rect = canvas?.getBoundingClientRect?.();
      const scaleX = rect?.width ? GAME_WIDTH / rect.width : 1;
      const scaleY = rect?.height ? GAME_HEIGHT / rect.height : 1;
      const next = this.clampSize(
        startW + (event.clientX - startClientX) * scaleX,
        startH + (event.clientY - startClientY) * scaleY,
      );
      this.sizeW = next.width;
      this.sizeH = next.height;
      widget.style.width = `${this.sizeW}px`;
      widget.style.height = `${this.sizeH}px`;
      const pos = this.clampPos(left + this.sizeW / 2, top + this.sizeH / 2);
      this.dom.x = pos.x;
      this.dom.y = pos.y;
      this.dragX = pos.x;
      this.dragY = pos.y;
      if (typeof this.dom.updateSize === 'function') this.dom.updateSize();
    };

    const onUp = (event) => {
      if (!resizing) return;
      resizing = false;
      handle.classList.remove('is-resizing');
      try { handle.releasePointerCapture?.(event.pointerId); } catch { /* ignore */ }
      if (typeof this.dom?.updateSize === 'function') this.dom.updateSize();
    };

    handle.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    this._resizeCleanup = () => {
      handle.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      handle.classList.remove('is-resizing');
    };
  }

  currentChannelKey() {
    if (this.activeTab === 'GENERAL') return 'general';
    if (this.activeTab === 'PRIVATE' && this.privatePeer) {
      return privateKey(session.user?.username, this.privatePeer);
    }
    if (this.activeTab === 'MATCH' && this.activeMatchId) return `match:${this.activeMatchId}`;
    return null;
  }

  totalUnread() {
    return Object.values(this.unreadByKey || {}).reduce((sum, n) => sum + (Number(n) || 0), 0);
  }

  appendMessage(msg) {
    const key = msg?.channelKey;
    if (!key) return;
    const list = this.messagesByKey[key] || [];
    if (msg.id && list.some((m) => m.id === msg.id)) return;
    this.messagesByKey[key] = [...list, msg].slice(-200);

    if (msg.channelType === 'PRIVATE') {
      const peer = resolvePrivatePeer(session.user?.username, msg.channelKey);
      if (peer) {
        const prevDialog = this.privateDialogs.find((d) => d.channelKey === msg.channelKey);
        this.privateDialogs = [{
          username: peer,
          channelKey: msg.channelKey,
          lastMessage: msg.text,
          lastCreatedAt: msg.createdAt,
          avatarUrl: prevDialog?.avatarUrl || (msg.fromUsername?.toLowerCase() === peer ? msg.fromAvatarUrl : null),
        }, ...this.privateDialogs.filter((d) => d.channelKey !== msg.channelKey)].slice(0, 50);
      }
    }

    if (key !== this.currentChannelKey() && msg.fromUsername !== session.user?.username) {
      this.unreadByKey[key] = (this.unreadByKey[key] || 0) + 1;
    }
    this.renderUi();
  }

  connectSocket() {
    const token = getAccessToken();
    if (!token) return;
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { token },
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        this.connected = true;
        client.subscribe('/topic/chat/general', (frame) => this.appendMessage(JSON.parse(frame.body)));
        client.subscribe('/user/queue/chat/private', (frame) => this.appendMessage(JSON.parse(frame.body)));
        client.subscribe('/user/queue/chat/errors', (frame) => {
          try {
            const err = JSON.parse(frame.body);
            this.error = err?.error || 'Ошибка чата';
          } catch {
            this.error = 'Ошибка чата';
          }
          this.renderUi();
        });
        this.resubscribeMatch();
        this.renderUi();
      },
      onDisconnect: () => {
        this.connected = false;
        this.renderUi();
      },
      onStompError: () => {
        this.connected = false;
        this.renderUi();
      },
      onWebSocketClose: () => {
        this.connected = false;
        this.renderUi();
      },
    });
    this.client = client;
    client.activate();
  }

  loadBootstrap() {
    api.get('/api/chat/history/general')
      .then(({ data }) => {
        this.messagesByKey.general = data || [];
        this.renderUi();
      })
      .catch(() => {});

    api.get('/api/chat/private-dialogs')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        this.privateDialogs = list;
        list.forEach((d) => {
          const key = d.channelKey || privateKey(session.user?.username, d.username);
          this.unreadByKey[key] = d.unreadCount || 0;
        });
        this.renderUi();
      })
      .catch(() => {});

    api.get('/api/chat/unread')
      .then(({ data }) => {
        this.unreadByKey = { ...this.unreadByKey, ...(data?.countsByChannelKey || {}) };
        this.renderUi();
      })
      .catch(() => {});

    const loadActiveMatch = () => {
      api.get('/api/chat/active-match')
        .then(({ data }) => {
          const nextId = data?.matchId || null;
          if (nextId !== this.activeMatchId) {
            this.activeMatchId = nextId;
            this.resubscribeMatch();
            if (nextId && !this.messagesByKey[`match:${nextId}`]) {
              api.get(`/api/chat/history/match/${nextId}`)
                .then(({ data: hist }) => {
                  this.messagesByKey[`match:${nextId}`] = hist || [];
                  this.renderUi();
                })
                .catch(() => {});
            }
            this.renderUi();
          }
        })
        .catch(() => {
          this.activeMatchId = null;
        });
    };
    loadActiveMatch();
    this.matchPoll = setInterval(loadActiveMatch, 10000);
  }

  resubscribeMatch() {
    if (this.matchSub) {
      try { this.matchSub.unsubscribe(); } catch { /* ignore */ }
      this.matchSub = null;
    }
    if (!this.client?.connected || !this.activeMatchId) return;
    this.matchSub = this.client.subscribe(
      `/topic/chat/match/${this.activeMatchId}`,
      (frame) => this.appendMessage(JSON.parse(frame.body)),
    );
  }

  markCurrentRead() {
    const key = this.currentChannelKey();
    if (!key) return;
    this.unreadByKey[key] = 0;
    if (this.activeTab === 'GENERAL') api.post('/api/chat/read/general').catch(() => {});
    else if (this.activeTab === 'PRIVATE' && this.privatePeer) {
      api.post(`/api/chat/read/private/${encodeURIComponent(this.privatePeer)}`).catch(() => {});
    } else if (this.activeTab === 'MATCH' && this.activeMatchId) {
      api.post(`/api/chat/read/match/${this.activeMatchId}`).catch(() => {});
    }
  }

  openPrivate(peerRaw) {
    const peer = (peerRaw || '').trim();
    if (!peer) return;
    this.privatePeer = peer;
    this.privateInput = peer;
    this.activeTab = 'PRIVATE';
    const key = privateKey(session.user?.username, peer);
    this.unreadByKey[key] = 0;
    api.post(`/api/chat/read/private/${encodeURIComponent(peer)}`).catch(() => {});
    if (!this.messagesByKey[key]) {
      api.get(`/api/chat/history/private/${encodeURIComponent(peer)}`)
        .then(({ data }) => {
          this.messagesByKey[key] = data || [];
          this.renderUi();
        })
        .catch((e) => {
          this.error = e.response?.data?.message || 'Не удалось открыть приват';
          this.renderUi();
        });
    }
    this.renderUi();
  }

  sendText(text) {
    const body = (text || '').trim();
    if (!body) return;
    if (!this.client?.connected) {
      this.error = 'Чат временно офлайн';
      this.renderUi();
      return;
    }
    this.error = '';
    try {
      if (this.activeTab === 'GENERAL') {
        this.client.publish({ destination: '/app/chat/send/general', body: JSON.stringify({ text: body }) });
      } else if (this.activeTab === 'PRIVATE') {
        if (!this.privatePeer) {
          this.error = 'Сначала выберите username для привата';
          this.renderUi();
          return;
        }
        this.client.publish({
          destination: '/app/chat/send/private',
          body: JSON.stringify({ username: this.privatePeer, text: body }),
        });
      } else if (this.activeTab === 'MATCH') {
        if (!this.activeMatchId) {
          this.error = 'Сейчас нет активного матча';
          this.renderUi();
          return;
        }
        this.client.publish({
          destination: `/app/chat/send/match/${this.activeMatchId}`,
          body: JSON.stringify({ text: body }),
        });
      }
    } catch (err) {
      this.error = err?.message || 'Не удалось отправить';
      this.renderUi();
    }
  }

  renderUi() {
    if (this._dead) return;
    this.destroyDom();
    if (!session.user?.id) return;

    const { x, y } = this.panelPosition();
    const unread = this.totalUnread();
    const html = this.collapsed ? this.collapsedHtml(unread) : this.expandedHtml(unread);
    this.dom = this.add.dom(x, y).createFromHTML(`<div class="phaser-dom-wrap">${html}</div>`);
    this.dom.setOrigin(0.5, 0.5);
    if (typeof this.dom.updateSize === 'function') this.dom.updateSize();
    this.dom.setDepth(1000);
    this.bindDom(this.dom.node);
    this.bindDrag(this.dom.node);
    this.bindResize(this.dom.node);

    requestAnimationFrame(() => {
      try {
        if (this._dead || !this.dom?.active) return;
        if (typeof this.dom.updateSize === 'function') {
          this.dom.updateSize();
          this.dom.setOrigin(0.5, 0.5);
        }
        const messages = this.dom?.node?.querySelector('.chat-widget-messages');
        if (messages) messages.scrollTop = messages.scrollHeight;
      } catch { /* ignore */ }
    });
  }

  collapsedHtml(unread) {
    return `
      <div class="chat-widget chat-widget--collapsed chat-widget--phaser">
        <button type="button" class="chat-fab" data-chat-expand data-chat-drag title="Перетащите или откройте">
          Чат${unread > 0 ? ` (${unread})` : ''}
        </button>
      </div>`;
  }

  expandedHtml(unread) {
    const generalUnread = this.unreadByKey.general || 0;
    const privateUnread = Object.entries(this.unreadByKey)
      .filter(([k]) => k.startsWith('private:'))
      .reduce((sum, [, v]) => sum + (v || 0), 0);
    const matchUnread = this.activeMatchId ? (this.unreadByKey[`match:${this.activeMatchId}`] || 0) : 0;
    const key = this.currentChannelKey();
    const messages = key ? (this.messagesByKey[key] || []) : [];
    const me = session.user?.username;

    const messagesHtml = messages.length
      ? messages.map((m) => `
          <div class="chat-msg ${m.fromUsername === me ? 'chat-msg--me' : ''}">
            <div class="chat-msg-body">
              <span class="chat-msg-author">${escapeAttr(m.fromUsername)}</span>
              <span class="chat-msg-time">${escapeAttr(formatTime(m.createdAt))}</span>
              <span class="chat-msg-text">${escapeAttr(m.text)}</span>
            </div>
          </div>`).join('')
      : '<div class="chat-empty">Сообщений пока нет.</div>';

    const dialogsHtml = this.privateDialogs.map((d) => {
      const dKey = d.channelKey || privateKey(me, d.username);
      const u = this.unreadByKey[dKey] || 0;
      return `
        <button type="button" class="chat-dialog ${this.privatePeer === d.username ? 'chat-dialog--active' : ''}" data-open-dialog="${escapeAttr(d.username)}">
          <span class="chat-dialog-avatar chat-dialog-avatar--fallback">${escapeAttr(initials(d.username))}</span>
          <span class="chat-dialog-name">${escapeAttr(d.username)}</span>
          <span class="chat-dialog-last">${escapeAttr(d.lastMessage || '...')}</span>
          ${u > 0 ? `<span class="chat-dialog-unread">${u}</span>` : ''}
        </button>`;
    }).join('');

    return `
      <div class="chat-widget chat-widget--phaser chat-widget--theme-${this.activeTab.toLowerCase()}"
        style="width:${Math.round(this.sizeW)}px;height:${Math.round(this.sizeH)}px;max-width:none;">
        <div class="chat-widget-head" data-chat-drag title="Перетащите окно">
          <div class="chat-widget-title-wrap">
            <span class="chat-widget-title">Lotus Chat</span>
            <span class="chat-widget-conn ${this.connected ? 'chat-widget-conn--online' : 'chat-widget-conn--offline'}">
              ${this.connected ? 'online' : 'offline'}
            </span>
          </div>
          <button type="button" class="chat-widget-toggle" data-chat-collapse>Свернуть</button>
        </div>
        <div class="chat-widget-tabs">
          <button type="button" class="${this.activeTab === 'GENERAL' ? 'is-active' : ''}" data-chat-tab="GENERAL">
            Общий${generalUnread ? ` (${generalUnread})` : ''}
          </button>
          <button type="button" class="${this.activeTab === 'PRIVATE' ? 'is-active' : ''}" data-chat-tab="PRIVATE">
            Приват${privateUnread ? ` (${privateUnread})` : ''}
          </button>
          <button type="button" class="${this.activeTab === 'MATCH' ? 'is-active' : ''}" data-chat-tab="MATCH" ${this.activeMatchId ? '' : 'disabled'}>
            Матч${matchUnread ? ` (${matchUnread})` : ''}
          </button>
        </div>
        ${this.activeTab === 'PRIVATE' ? `
          <div class="chat-widget-private-open">
            <input type="text" name="peer" maxlength="50" placeholder="username" value="${escapeAttr(this.privateInput)}" />
            <button type="button" data-open-private>Открыть</button>
          </div>
          <div class="chat-widget-dialogs">${dialogsHtml}</div>
        ` : ''}
        <div class="chat-widget-status">
          ${this.activeTab === 'PRIVATE' && this.privatePeer ? `Приват: ${escapeAttr(this.privatePeer)}` : ''}
          ${this.activeTab === 'MATCH' && this.activeMatchId ? `Канал матча #${this.activeMatchId}` : ''}
          ${unread > 0 && !this.currentChannelKey() ? `Непрочитано: ${unread}` : ''}
        </div>
        <div class="chat-widget-messages">${messagesHtml}</div>
        ${this.error ? `<div class="chat-error">${escapeAttr(this.error)}</div>` : ''}
        <form class="chat-widget-send">
          <input type="text" name="text" maxlength="500" placeholder="Сообщение..." autocomplete="off" />
          <button type="submit">➤</button>
        </form>
        <div class="chat-resize" data-chat-resize title="Растянуть"></div>
      </div>`;
  }

  bindDom(root) {
    if (!root) return;
    root.querySelector('[data-chat-expand]')?.addEventListener('click', () => {
      this.collapsed = false;
      this.markCurrentRead();
      this.renderUi();
    });
    root.querySelector('[data-chat-collapse]')?.addEventListener('click', () => {
      this.collapsed = true;
      this.renderUi();
    });
    root.querySelectorAll('[data-chat-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        this.activeTab = btn.getAttribute('data-chat-tab') || 'GENERAL';
        this.markCurrentRead();
        this.renderUi();
      });
    });
    root.querySelector('[data-open-private]')?.addEventListener('click', () => {
      const input = root.querySelector('input[name="peer"]');
      this.privateInput = input?.value || '';
      this.openPrivate(this.privateInput);
    });
    root.querySelectorAll('[data-open-dialog]').forEach((btn) => {
      btn.addEventListener('click', () => this.openPrivate(btn.getAttribute('data-open-dialog')));
    });
    const form = root.querySelector('form.chat-widget-send');
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = form.querySelector('input[name="text"]');
      const value = input?.value || '';
      this.sendText(value);
      if (input) input.value = '';
    });
  }
}

export function ensureChatScene(scene) {
  if (!session.user?.id || !scene?.scene) return;
  if (scene.scene.isActive('ChatScene')) return;
  scene.scene.launch('ChatScene');
}

export function stopChatScene(scene) {
  if (!scene?.scene) return;
  if (scene.scene.get('ChatScene')) scene.scene.stop('ChatScene');
}

export default ChatScene;
