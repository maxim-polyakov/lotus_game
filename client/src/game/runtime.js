import Phaser from 'phaser';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import api, { API_BASE, WS_URL } from '../api/client';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../utils/tokenStorage';

const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
const ACTIVE_MATCH_KEY = 'lotus_active_match_id';
const DEFAULT_HERO_ID = 'lotus_guardian';

const palette = {
  bg: 0x10141f,
  panel: 0x1d2536,
  panel2: 0x28344b,
  primary: 0xd7aa45,
  primaryDark: 0x936b22,
  text: '#f6ead2',
  muted: '#aab4c8',
  danger: 0xd96b6b,
  ok: 0x64c987,
};

const session = {
  user: null,
  soundEnabled: localStorage.getItem('lotus_sound_enabled') !== 'false',
  selectedHeroId: localStorage.getItem('lotus_selected_hero_id') || DEFAULT_HERO_ID,
};

const routeToScene = {
  '/': 'MenuScene',
  '/login': 'AuthScene',
  '/register': 'AuthScene',
  '/forgot-password': 'AuthScene',
  '/verify-email': 'AuthScene',
  '/heroes': 'HeroesScene',
  '/decks': 'DecksScene',
  '/decks/new': 'DeckEditorScene',
  '/play': 'PlayScene',
  '/profile': 'ProfileScene',
  '/leaderboard': 'LeaderboardScene',
  '/replays': 'ReplaysScene',
  '/friends': 'FriendsScene',
  '/notifications': 'NotificationsScene',
  '/shop': 'ShopScene',
  '/admin': 'AdminScene',
};

const sceneToRoute = Object.fromEntries(Object.entries(routeToScene).map(([route, scene]) => [scene, route]));

function sceneForCurrentRoute() {
  const path = window.location.pathname;
  if (path.startsWith('/replay/')) return 'ReplayViewerScene';
  if (path.startsWith('/decks/') && path !== '/decks/new') return 'DeckEditorScene';
  return routeToScene[path] || 'MenuScene';
}

function authModeForCurrentRoute() {
  const path = window.location.pathname;
  if (path === '/register') return 'register';
  if (path === '/forgot-password') return 'forgot';
  if (path === '/verify-email') return 'verify';
  return 'login';
}

function cardKey(card) {
  return `${card?.cardType || 'CARD'}:${card?.id}`;
}

function cardSlotKey(cardOrSlot) {
  return `${cardOrSlot?.cardType || 'CARD'}:${cardOrSlot?.cardId ?? cardOrSlot?.id}`;
}

function textureKey(card) {
  return `card-art-${cardKey(card)}`;
}

function hashString(value) {
  let hash = 0;
  const text = String(value || '');
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function imageTextureKey(url) {
  return `remote-image-${hashString(url)}`;
}

function circularAvatarKey(url, size) {
  return `avatar-circle-${hashString(url)}-${Math.round(size)}`;
}

function deckHeroId(deck) {
  return deck?.heroId || DEFAULT_HERO_ID;
}

function escapeAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.cards)) return value.cards;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

async function loadCurrentUser() {
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

async function loginUser(usernameOrEmail, password, rememberMe) {
  const { data } = await api.post('/api/auth/login', { usernameOrEmail, password });
  if (data?.requiresEmailVerification) {
    throw new Error('Email не подтверждён. Откройте экран подтверждения.');
  }
  setTokens(data.accessToken, data.refreshToken, rememberMe);
  const { data: me } = await api.get('/api/me');
  session.user = me;
  return me;
}

async function completeOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const accessToken = params.get('accessToken');
  const refreshToken = params.get('refreshToken');
  if (params.get('oauth') === 'google' && code) {
    const { data } = await api.get(`/api/auth/oauth-tokens?code=${encodeURIComponent(code)}`);
    setTokens(data.accessToken, data.refreshToken, true);
    window.history.replaceState({}, '', '/');
    return loadCurrentUser();
  }
  if (accessToken && refreshToken) {
    setTokens(accessToken, refreshToken, true);
    window.history.replaceState({}, '', '/');
    return loadCurrentUser();
  }
  return null;
}

class MatchSocket {
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

const matchSocket = new MatchSocket();

class BaseScene extends Phaser.Scene {
  clearScene() {
    this.children.removeAll(true);
    this.input.removeAllListeners();
  }

  drawBackground(title) {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, palette.bg).setOrigin(0);
    const logoKey = this.textures.exists('lotus-logo') ? 'lotus-logo' : 'lotus-logo-fallback';
    if (this.textures.exists(logoKey)) {
      this.add.image(58, 52, logoKey).setDisplaySize(48, 48);
    } else {
      this.add.circle(58, 52, 24, palette.primaryDark).setStrokeStyle(2, palette.primary);
      this.add.text(58, 52, 'L', {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '26px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);
    }
    this.add.text(94, 34, title, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '34px',
      color: palette.text,
      fontStyle: 'bold',
    });
    this.addAvatar(GAME_WIDTH - 78, 53, session.user?.avatarUrl, session.user?.username || 'Guest', 42);
    this.add.text(GAME_WIDTH - 110, 42, session.user ? session.user.username : 'Guest', {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '18px',
      color: palette.muted,
    }).setOrigin(1, 0);
  }

  addButton(x, y, width, height, label, onClick, options = {}) {
    const fill = options.fill ?? palette.panel2;
    const stroke = options.stroke ?? palette.primary;
    const container = this.add.container(x, y);
    const rect = this.add.rectangle(0, 0, width, height, fill, 0.96)
      .setStrokeStyle(2, stroke)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(0, 0, label, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: `${options.fontSize || 18}px`,
      color: options.color || palette.text,
      align: 'center',
    }).setOrigin(0.5);

    rect.on('pointerover', () => rect.setFillStyle(options.hoverFill ?? palette.primaryDark));
    rect.on('pointerout', () => rect.setFillStyle(fill));
    rect.on('pointerdown', () => onClick?.());
    container.add([rect, text]);
    return container;
  }

  addBackButton(target = 'MenuScene') {
    this.addButton(82, GAME_HEIGHT - 44, 120, 40, 'Назад', () => this.goto(target), { fontSize: 16 });
  }

  goto(scene, data = {}) {
    const route = sceneToRoute[scene] || '/';
    if (window.location.pathname !== route) {
      window.history.pushState({}, '', route);
    }
    this.scene.start(scene, data);
  }

  addPanel(x, y, width, height, alpha = 0.88) {
    return this.add.rectangle(x, y, width, height, palette.panel, alpha)
      .setStrokeStyle(1, 0x34445f)
      .setOrigin(0.5);
  }

  addMessage(message, color = palette.muted, y = GAME_HEIGHT - 86) {
    this.add.text(GAME_WIDTH / 2, y, message, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '18px',
      color,
      align: 'center',
      wordWrap: { width: 900 },
    }).setOrigin(0.5);
  }

  addDomForm(x, y, html, onSubmit) {
    const dom = this.add.dom(x, y).createFromHTML(html);
    const node = dom.node;
    const form = node.querySelector('form');
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form);
      onSubmit(Object.fromEntries(data.entries()));
    });
    return dom;
  }

  loadCardTextures(cards = []) {
    const toLoad = cards.filter((c) => c.imageUrl && !this.textures.exists(textureKey(c)));
    if (!toLoad.length) return Promise.resolve();
    return new Promise((resolve) => {
      toLoad.forEach((card) => this.load.image(textureKey(card), card.imageUrl));
      this.load.once('complete', resolve);
      this.load.start();
    });
  }

  loadImageUrls(urls = []) {
    const cleanUrls = urls.filter(Boolean);
    const toLoad = cleanUrls.filter((url) => !this.textures.exists(imageTextureKey(url)));
    if (!toLoad.length) return Promise.resolve();
    return new Promise((resolve) => {
      toLoad.forEach((url) => this.load.image(imageTextureKey(url), url));
      this.load.once('complete', resolve);
      this.load.start();
    });
  }

  addAvatar(x, y, url, name = '?', size = 44) {
    const radius = size / 2;
    this.add.circle(x, y, radius, 0x2c3850);
    if (url && this.textures.exists(imageTextureKey(url))) {
      const key = this.ensureCircularAvatarTexture(url, size - 4);
      this.add.image(x, y, key).setDisplaySize(size - 4, size - 4);
      this.add.circle(x, y, radius, 0x000000, 0).setStrokeStyle(2, palette.primary);
      return;
    }
    this.add.circle(x, y, radius, 0x000000, 0).setStrokeStyle(2, palette.primary);
    this.add.text(x, y, (name || '?').slice(0, 2).toUpperCase(), {
      fontFamily: 'Segoe UI, Arial',
      fontSize: `${Math.max(14, size / 2.4)}px`,
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  ensureCircularAvatarTexture(url, size) {
    const outputKey = circularAvatarKey(url, size);
    if (this.textures.exists(outputKey)) return outputKey;

    const source = this.textures.get(imageTextureKey(url))?.getSourceImage();
    const texture = this.textures.createCanvas(outputKey, size, size);
    const ctx = texture.getContext();
    const sourceWidth = source?.naturalWidth || source?.width || size;
    const sourceHeight = source?.naturalHeight || source?.height || size;
    const scale = Math.max(size / sourceWidth, size / sourceHeight);
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    const drawX = (size - drawWidth) / 2;
    const drawY = (size - drawHeight) / 2;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    try {
      ctx.drawImage(source, drawX, drawY, drawWidth, drawHeight);
    } catch {
      ctx.fillStyle = '#2c3850';
      ctx.fillRect(0, 0, size, size);
    }
    ctx.restore();
    texture.refresh();
    return outputKey;
  }
}

class BootScene extends BaseScene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.image('lotus-logo', '/lotus.jpg');
    this.load.svg('lotus-logo-fallback', '/lotus.svg', { width: 256, height: 256 });
  }

  create() {
    this.drawBackground('Lotus Game');
    this.addMessage('Загрузка профиля...', palette.text, GAME_HEIGHT / 2);
    completeOAuthCallback()
      .catch(() => null)
      .then(() => loadCurrentUser())
      .then(() => this.loadImageUrls([session.user?.avatarUrl]))
      .then(() => {
      const targetScene = sceneForCurrentRoute();
      if (!session.user && !['AuthScene', 'LeaderboardScene'].includes(targetScene)) {
        this.scene.start('AuthScene', { mode: authModeForCurrentRoute() });
        return;
      }
      this.scene.start(targetScene, targetScene === 'AuthScene' ? { mode: authModeForCurrentRoute() } : {});
    });
  }
}

class AuthScene extends BaseScene {
  constructor() {
    super('AuthScene');
  }

  create(data = {}) {
    this.mode = data.mode || 'login';
    this.render();
  }

  render(error = '') {
    this.clearScene();
    const title = this.mode === 'register'
      ? 'Регистрация'
      : this.mode === 'forgot'
        ? 'Сброс пароля'
        : this.mode === 'verify'
          ? 'Подтверждение email'
          : 'Вход';
    this.drawBackground(title);
    this.addPanel(GAME_WIDTH / 2, 360, 460, 450);

    const formHtml = this.formHtml();
    this.addDomForm(GAME_WIDTH / 2, 370, formHtml, (values) => this.submit(values));

    if (error) this.addMessage(error, '#ffb3b3', 640);
    this.addButton(468, 600, 150, 40, 'Вход', () => this.scene.restart({ mode: 'login' }), { fontSize: 16 });
    this.addButton(640, 600, 170, 40, 'Регистрация', () => this.scene.restart({ mode: 'register' }), { fontSize: 16 });
    this.addButton(830, 600, 180, 40, 'Забыли пароль', () => this.scene.restart({ mode: 'forgot' }), { fontSize: 16 });
  }

  formHtml() {
    if (this.mode === 'register') {
      return `
        <form class="phaser-form">
          <input name="username" placeholder="Username" required />
          <input name="email" type="email" placeholder="Email" required />
          <input name="password" type="password" placeholder="Password" required />
          <button type="submit">Создать аккаунт</button>
        </form>`;
    }
    if (this.mode === 'verify') {
      return `
        <form class="phaser-form">
          <input name="email" type="email" placeholder="Email" required />
          <input name="code" placeholder="Код подтверждения" required />
          <button type="submit">Подтвердить</button>
        </form>`;
    }
    if (this.mode === 'forgot') {
      return `
        <form class="phaser-form">
          <input name="email" type="email" placeholder="Email" required />
          <input name="code" placeholder="Код, если уже пришёл" />
          <input name="newPassword" type="password" placeholder="Новый пароль" />
          <button type="submit">Отправить / сбросить</button>
        </form>`;
    }
    return `
      <form class="phaser-form">
        <input name="usernameOrEmail" placeholder="Username или email" required />
        <input name="password" type="password" placeholder="Password" required />
        <label><input name="rememberMe" type="checkbox" value="yes" /> Запомнить меня</label>
        <button type="submit">Войти</button>
        <a href="${API_BASE}/oauth2/authorization/google">Google OAuth</a>
      </form>`;
  }

  async submit(values) {
    try {
      if (this.mode === 'register') {
        await api.post('/api/auth/register', values);
        this.scene.restart({ mode: 'verify' });
        return;
      }
      if (this.mode === 'verify') {
        const { data } = await api.post('/api/auth/verify-email', values);
        setTokens(data.accessToken, data.refreshToken, true);
        await loadCurrentUser();
        this.goto('MenuScene');
        return;
      }
      if (this.mode === 'forgot') {
        if (values.code && values.newPassword) {
          await api.post('/api/auth/reset-password', values);
          this.scene.restart({ mode: 'login' });
        } else {
          await api.post('/api/auth/forgot-password', { email: values.email });
          this.render('Код отправлен на email. Введите код и новый пароль.');
        }
        return;
      }
      await loginUser(values.usernameOrEmail, values.password, values.rememberMe === 'yes');
      this.goto('MenuScene');
    } catch (err) {
      this.render(err.response?.data?.message || err.message || 'Ошибка');
    }
  }
}

class MenuScene extends BaseScene {
  constructor() {
    super('MenuScene');
  }

  create() {
    this.drawBackground('Lotus Game');
    this.addPanel(GAME_WIDTH / 2, 370, 620, 520);
    this.add.text(GAME_WIDTH / 2, 150, session.user ? `Добро пожаловать, ${session.user.username}` : 'Гость', {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '28px',
      color: palette.text,
    }).setOrigin(0.5);

    const items = [
      ['Играть', 'PlayScene'],
      ['Герои', 'HeroesScene'],
      ['Колоды', 'DecksScene'],
      ['Магазин', 'ShopScene'],
      ['Профиль', 'ProfileScene'],
      ['Рейтинг', 'LeaderboardScene'],
      ['Реплеи', 'ReplaysScene'],
      ['Друзья', 'FriendsScene'],
      ['Уведомления', 'NotificationsScene'],
    ];
    if (session.user?.roles?.includes('ROLE_ADMIN')) items.push(['Админка', 'AdminScene']);

    items.forEach(([label, scene], index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      this.addButton(500 + col * 280, 230 + row * 66, 230, 46, label, () => this.goto(scene));
    });
    this.addButton(GAME_WIDTH / 2, 620, 220, 44, 'Выйти', () => {
      clearTokens();
      session.user = null;
      matchSocket.disconnect();
      this.goto('AuthScene');
    }, { fill: 0x52303a, stroke: palette.danger });
  }
}

class ListScene extends BaseScene {
  constructor(key, title, loader, formatter) {
    super(key);
    this.title = title;
    this.loader = loader;
    this.formatter = formatter;
  }

  create() {
    this.drawBackground(this.title);
    this.addBackButton();
    this.addMessage('Загрузка...', palette.text, 120);
    this.loader()
      .then((items) => this.render(items || []))
      .catch((err) => this.render([], err.response?.data?.message || err.message || 'Ошибка загрузки'));
  }

  render(items, error = '') {
    this.clearScene();
    this.drawBackground(this.title);
    this.addBackButton();
    this.addPanel(GAME_WIDTH / 2, 380, 1040, 520);
    if (error) this.addMessage(error, '#ffb3b3', 145);
    if (!items.length && !error) this.addMessage('Пока пусто', palette.muted, 160);
    items.slice(0, 18).forEach((item, index) => {
      const y = 150 + index * 28;
      this.add.text(165, y, this.formatter(item, index), {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '17px',
        color: palette.text,
        wordWrap: { width: 950 },
      });
    });
  }
}

class HeroesScene extends ListScene {
  constructor() {
    super('HeroesScene', 'Герои', async () => [], () => '');
  }

  create() {
    this.drawBackground('Герои');
    this.addBackButton();
    this.addMessage('Загрузка героев...', palette.text, 120);
    api.get('/api/heroes')
      .then(({ data }) => this.renderHeroes(data || []))
      .catch((err) => this.renderHeroes([], err.response?.data?.message || err.message || 'Ошибка загрузки'));
  }

  renderHeroes(heroes, error = '') {
    this.clearScene();
    this.drawBackground('Герои');
    this.addBackButton();
    if (error) this.addMessage(error, '#ffb3b3', 120);
    heroes.forEach((hero, index) => {
      const x = 230 + (index % 4) * 270;
      const y = 185 + Math.floor(index / 4) * 180;
      const selected = session.selectedHeroId === hero.id;
      const panel = this.add.rectangle(x, y, 230, 140, hero.unlocked === false ? 0x252a36 : palette.panel2, 0.95)
        .setStrokeStyle(2, selected ? palette.primary : 0x53627a)
        .setInteractive({ useHandCursor: hero.unlocked !== false });
      this.add.circle(x, y - 36, 34, selected ? palette.primaryDark : 0x3c4964);
      this.add.text(x, y - 50, (hero.name || '?').slice(0, 1), {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '34px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.add.text(x, y + 4, hero.name || hero.id, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '19px',
        color: palette.text,
        align: 'center',
        wordWrap: { width: 200 },
      }).setOrigin(0.5);
      this.add.text(x, y + 42, hero.unlocked === false ? `До открытия: ${hero.gamesUntilUnlock ?? '?'}` : `HP ${hero.startingHealth}`, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '15px',
        color: hero.unlocked === false ? '#ffb3b3' : palette.muted,
      }).setOrigin(0.5);
      if (hero.unlocked !== false) {
        panel.on('pointerdown', () => {
          session.selectedHeroId = hero.id;
          localStorage.setItem('lotus_selected_hero_id', hero.id);
          this.renderHeroes(heroes);
        });
      }
    });
  }
}

class DecksScene extends ListScene {
  constructor() {
    super('DecksScene', 'Колоды', async () => [], () => '');
  }

  create() {
    this.drawBackground('Колоды');
    this.addBackButton();
    this.addMessage('Загрузка колод...', palette.text, 120);
    Promise.all([
      api.get('/api/decks').then(({ data }) => data || []),
      api.get('/api/cards').then(({ data }) => data || []),
      api.get('/api/heroes').then(({ data }) => asArray(data)),
    ]).then(([decks, cards, heroes]) => Promise.all([
      this.loadCardTextures(cards),
      this.loadImageUrls(heroes.map((h) => h.portraitUrl)),
    ]).then(() => this.renderDecks(decks, cards, heroes)))
      .catch((err) => this.renderDecks([], [], [], err.response?.data?.message || err.message || 'Ошибка загрузки'));
  }

  renderDecks(decks, cards, heroes = [], error = '') {
    this.clearScene();
    this.drawBackground('Колоды');
    this.addBackButton();
    this.addButton(1120, 675, 190, 40, 'Новая колода', () => {
      window.history.pushState({}, '', '/decks/new');
      this.scene.start('DeckEditorScene');
    }, { fontSize: 16, fill: palette.primaryDark });
    if (error) this.addMessage(error, '#ffb3b3', 120);
    decks.slice(0, 6).forEach((deck, index) => {
      const hero = heroes.find((h) => h.id === deckHeroId(deck));
      const x = 260 + (index % 2) * 510;
      const y = 170 + Math.floor(index / 2) * 178;
      this.add.rectangle(x, y, 460, 156, palette.panel, 0.92)
        .setStrokeStyle(2, 0x53627a)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          window.history.pushState({}, '', `/decks/${deck.id}`);
          this.scene.start('DeckEditorScene', { deckId: deck.id });
        });
      this.add.text(x - 210, y - 55, deck.name, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '22px',
        color: palette.text,
      });
      this.addAvatar(x - 195, y - 18, hero?.portraitUrl, hero?.name || deckHeroId(deck), 28);
      this.add.text(x - 174, y - 28, `${hero?.name || deckHeroId(deck)}  |  Карт: ${(deck.cards || []).reduce((sum, c) => sum + (c.count || 0), 0)}`, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '15px',
        color: palette.muted,
      });
      (deck.cards || []).slice(0, 4).forEach((slot, cardIndex) => {
        const card = cards.find((c) => c.cardType === slot.cardType && c.id === slot.cardId);
        if (!card) return;
        const view = new CardGameObject(this, x - 116 + cardIndex * 72, y + 26, card, { width: 58, height: 80 });
        view.setScale(0.9);
      });
    });
  }
}

class DeckEditorScene extends BaseScene {
  constructor() {
    super('DeckEditorScene');
  }

  create(data = {}) {
    this.deckId = data.deckId || this.currentDeckIdFromPath();
    this.counts = new Map();
    this.deckName = '';
    this.drawBackground(this.deckId ? 'Редактор колоды' : 'Новая колода');
    this.addBackButton('DecksScene');
    this.addMessage('Загрузка коллекции...', palette.text, 120);
    Promise.all([
      this.deckId ? api.get(`/api/decks/${this.deckId}`).then(({ data: deck }) => deck) : Promise.resolve(null),
      api.get('/api/cards').then(({ data: cards }) => cards || []),
      api.get('/api/cards/collection').then(({ data: collection }) => asArray(collection)),
      api.get('/api/heroes').then(({ data: heroes }) => asArray(heroes)),
    ]).then(([deck, cards, collection, heroes]) => {
      this.deck = deck;
      this.cards = cards;
      this.collection = asArray(collection);
      this.heroes = asArray(heroes).filter((h) => h.unlocked !== false);
      this.deckName = deck?.name || 'Новая колода';
      this.heroId = deckHeroId(deck || { heroId: session.selectedHeroId });
      (deck?.cards || []).forEach((slot) => this.counts.set(cardSlotKey(slot), slot.count || 0));
      return this.loadCardTextures(cards);
    }).then(() => this.render()).catch((err) => this.renderError(err.response?.data?.message || err.message || 'Ошибка загрузки'));
  }

  currentDeckIdFromPath() {
    const match = window.location.pathname.match(/^\/decks\/(\d+)/);
    return match ? Number(match[1]) : null;
  }

  renderError(message) {
    this.clearScene();
    this.drawBackground('Редактор колоды');
    this.addBackButton('DecksScene');
    this.addMessage(message, '#ffb3b3', GAME_HEIGHT / 2);
  }

  render(message = '') {
    this.clearScene();
    this.drawBackground(this.deckId ? 'Редактор колоды' : 'Новая колода');
    this.addBackButton('DecksScene');
    const selectedCards = asArray(this.collection).filter((card) => (this.counts.get(cardSlotKey(card)) || 0) > 0);
    const total = [...this.counts.values()].reduce((sum, count) => sum + count, 0);

    this.addDomForm(255, 145, `
      <form class="phaser-form phaser-form-inline">
        <input name="name" placeholder="Название колоды" value="${this.deckName.replace(/"/g, '&quot;')}" required />
        <select name="heroId">${this.heroes.map((h) => `<option value="${h.id}" ${h.id === this.heroId ? 'selected' : ''}>${h.name}</option>`).join('')}</select>
        <button type="submit">Сохранить</button>
      </form>
    `, (values) => this.save(values));

    this.add.text(510, 125, `Карт в колоде: ${total}`, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '22px',
      color: total > 0 ? palette.text : '#ffb3b3',
    });
    if (message) this.addMessage(message, palette.text, 665);

    this.add.text(80, 245, 'Коллекция: нажмите карту, чтобы добавить', {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '18px',
      color: palette.muted,
    });
    this.collection.slice(0, 18).forEach((card, index) => {
      const x = 95 + (index % 7) * 78;
      const y = 310 + Math.floor(index / 7) * 112;
      const view = new CardGameObject(this, x, y, card, { width: 62, height: 88 });
      const key = cardSlotKey(card);
      const count = this.counts.get(key) || 0;
      if (count > 0) {
        this.add.circle(x + 27, y - 38, 11, palette.primaryDark);
        this.add.text(x + 27, y - 38, String(count), { fontFamily: 'Segoe UI, Arial', fontSize: '12px', color: '#fff' }).setOrigin(0.5);
      }
      view.on('pointerdown', () => {
        this.counts.set(key, Math.min(2, count + 1));
        view.playCardEffect();
        this.render();
      });
    });

    this.add.text(720, 245, 'В колоде: нажмите карту, чтобы убрать', {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '18px',
      color: palette.muted,
    });
    selectedCards.slice(0, 30).forEach((card, index) => {
      const x = 735 + (index % 6) * 78;
      const y = 300 + Math.floor(index / 6) * 78;
      const view = new CardGameObject(this, x, y, card, { width: 56, height: 76 });
      const key = cardSlotKey(card);
      this.add.text(x, y + 46, `x${this.counts.get(key)}`, { fontFamily: 'Segoe UI, Arial', fontSize: '13px', color: palette.text }).setOrigin(0.5);
      view.on('pointerdown', () => {
        const next = (this.counts.get(key) || 0) - 1;
        if (next <= 0) this.counts.delete(key);
        else this.counts.set(key, next);
        this.render();
      });
    });
  }

  async save(values) {
    try {
      const cards = [...this.counts.entries()].flatMap(([key, count]) => {
        const [cardType, rawId] = key.split(':');
        return count > 0 ? [{ cardType, cardId: Number(rawId), count }] : [];
      });
      const payload = { name: values.name, heroId: values.heroId, cards };
      if (this.deckId) await api.put(`/api/decks/${this.deckId}`, payload);
      else {
        const { data } = await api.post('/api/decks', payload);
        this.deckId = data.id;
        window.history.pushState({}, '', `/decks/${data.id}`);
      }
      this.deckName = values.name;
      this.heroId = values.heroId;
      this.render('Колода сохранена');
    } catch (err) {
      this.render(err.response?.data?.message || err.message || 'Не удалось сохранить');
    }
  }
}

class ShopScene extends ListScene {
  constructor() {
    super('ShopScene', 'Магазин', async () => [], () => '');
  }

  create() {
    this.drawBackground('Магазин');
    this.addBackButton();
    this.addMessage('Загрузка магазина...', palette.text, 120);
    Promise.all([
      api.get('/api/shop/status').then(({ data }) => data),
      api.get('/api/cards').then(({ data }) => data || []),
      api.get('/api/cards/collection').then(({ data }) => asArray(data)),
    ]).then(([status, cards, collection]) => this.loadCardTextures(cards).then(() => this.renderShop(status, cards, collection)))
      .catch((err) => this.renderShop(null, [], [], err.response?.data?.message || err.message || 'Ошибка загрузки'));
  }

  renderShop(status, cards, collection, error = '') {
    this.clearScene();
    this.drawBackground('Магазин');
    this.addBackButton();
    if (error) this.addMessage(error, '#ffb3b3', 120);
    this.addPanel(255, 170, 340, 135);
    this.add.text(110, 130, `Золото: ${status?.gold ?? 0}`, { fontFamily: 'Segoe UI, Arial', fontSize: '24px', color: '#ffe18c' });
    this.add.text(110, 166, `Пыль: ${status?.dust ?? 0}`, { fontFamily: 'Segoe UI, Arial', fontSize: '22px', color: '#b9d6ff' });
    this.addButton(760, 145, 260, 48, `Купить карту (${status?.randomCardPrice ?? 100})`, async () => {
      const { data } = await api.post('/api/shop/buy/random-card');
      this.renderShop({ ...status, gold: data.gold }, cards, collection);
    }, { fill: palette.primaryDark });
    this.addButton(760, 210, 260, 48, `Купить героя (${status?.randomHeroPrice ?? 300})`, async () => {
      const { data } = await api.post('/api/shop/buy/random-hero');
      this.renderShop({ ...status, gold: data.gold }, cards, collection);
    }, { fill: palette.primaryDark });

    const owned = new Set((collection || []).map((c) => cardKey(c)));
    cards.slice(0, 8).forEach((card, index) => {
      const x = 185 + index * 125;
      const y = 430;
      const view = new CardGameObject(this, x, y, card, { width: 100, height: 140 });
      const isOwned = owned.has(cardKey(card));
      if (!isOwned) view.setAlpha(0.55);
      this.add.text(x, y + 92, isOwned ? 'Есть' : `${status?.specificCardDustPrice ?? 120} пыли`, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '14px',
        color: isOwned ? '#9cffb5' : '#ffd38a',
      }).setOrigin(0.5);
      view.on('pointerdown', async () => {
        view.playCardEffect();
        if (isOwned) return;
        try {
          const { data } = await api.post('/api/shop/buy/card', { cardType: card.cardType, cardId: card.id });
          this.renderShop({ ...status, dust: data.dust }, cards, [...collection, data.card || card], 'Карта куплена');
        } catch (err) {
          this.renderShop(status, cards, collection, err.response?.data?.message || err.message || 'Не удалось купить карту');
        }
      });
    });
  }
}

class ProfileScene extends ListScene {
  constructor() {
    super('ProfileScene', 'Профиль', async () => [], () => '');
  }

  create() {
    this.drawBackground('Профиль');
    this.addBackButton();
    this.addMessage('Загрузка профиля...', palette.text, 120);
    Promise.all([api.get('/api/me'), api.get('/api/me/stats')])
      .then(([meRes, statsRes]) => this.loadImageUrls([meRes.data?.avatarUrl]).then(() => this.renderProfile(meRes.data, statsRes.data)))
      .catch((err) => this.renderProfile(null, null, err.response?.data?.message || err.message || 'Ошибка загрузки'));
  }

  renderProfile(me, stats, error = '') {
    this.clearScene();
    this.drawBackground('Профиль');
    this.addBackButton();
    if (error) this.addMessage(error, '#ffb3b3', 120);
    this.addPanel(340, 280, 460, 300);
    this.addAvatar(600, 205, me?.avatarUrl, me?.username, 96);
    this.add.text(150, 170, me ? me.username : 'Пользователь', { fontFamily: 'Segoe UI, Arial', fontSize: '30px', color: palette.text });
    this.add.text(150, 218, me?.email || '', { fontFamily: 'Segoe UI, Arial', fontSize: '18px', color: palette.muted });
    this.add.text(150, 270, `Рейтинг: ${me?.rating ?? 0}`, { fontFamily: 'Segoe UI, Arial', fontSize: '22px', color: '#ffe18c' });
    this.add.text(150, 310, `Золото: ${me?.gold ?? 0}   Пыль: ${me?.dust ?? 0}`, { fontFamily: 'Segoe UI, Arial', fontSize: '20px', color: palette.text });
    this.add.text(150, 360, `Матчи: ${stats?.totalMatches ?? 0} / Победы: ${stats?.wins ?? 0} / Поражения: ${stats?.losses ?? 0}`, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '18px',
      color: palette.muted,
    });
    this.addDomForm(850, 275, `
      <form class="phaser-form">
        <input name="username" placeholder="Username" value="${(me?.username || '').replace(/"/g, '&quot;')}" required />
        <input name="avatarUrl" placeholder="Avatar URL" value="${(me?.avatarUrl || '').replace(/"/g, '&quot;')}" />
        <button type="submit">Сохранить профиль</button>
      </form>
    `, async (values) => {
      try {
        const { data } = await api.put('/api/me', { username: values.username.trim(), avatarUrl: values.avatarUrl.trim() || null });
        session.user = { ...session.user, ...data };
        this.renderProfile(data, stats, 'Профиль сохранён');
      } catch (err) {
        this.renderProfile(me, stats, err.response?.data?.message || err.message || 'Не удалось сохранить');
      }
    });
  }
}

class LeaderboardScene extends ListScene {
  constructor() {
    super('LeaderboardScene', 'Рейтинг', async () => [], () => '');
  }

  create() {
    this.drawBackground('Рейтинг');
    this.addBackButton();
    this.addMessage('Загрузка рейтинга...', palette.text, 120);
    api.get('/api/leaderboard')
      .then(({ data }) => this.loadImageUrls(asArray(data).map((u) => u.avatarUrl)).then(() => this.renderLeaderboard(asArray(data))))
      .catch((err) => this.renderLeaderboard([], err.response?.data?.message || err.message || 'Ошибка загрузки'));
  }

  renderLeaderboard(players, error = '') {
    this.clearScene();
    this.drawBackground('Рейтинг');
    this.addBackButton();
    if (error) this.addMessage(error, '#ffb3b3', 120);
    players.slice(0, 12).forEach((u, index) => {
      const y = 135 + index * 42;
      this.add.rectangle(GAME_WIDTH / 2, y + 10, 720, 36, palette.panel, 0.92).setStrokeStyle(1, 0x53627a);
      this.addAvatar(310, y + 10, u.avatarUrl, u.username, 32);
      this.add.text(350, y, `${index + 1}. ${u.username}`, { fontFamily: 'Segoe UI, Arial', fontSize: '18px', color: palette.text });
      this.add.text(780, y, String(u.rating), { fontFamily: 'Segoe UI, Arial', fontSize: '18px', color: '#ffe18c' });
    });
  }
}

class FriendsScene extends ListScene {
  constructor() {
    super('FriendsScene', 'Друзья', async () => [], () => '');
  }

  create() {
    this.loadFriends();
  }

  loadFriends(message = '') {
    this.drawBackground('Друзья');
    this.addBackButton();
    this.addMessage('Загрузка друзей...', palette.text, 120);
    api.get('/api/friends')
      .then(({ data }) => {
        const urls = [
          ...(data.friends || []).map((x) => x.avatarUrl),
          ...(data.incoming || []).map((x) => x.avatarUrl),
          ...(data.outgoing || []).map((x) => x.avatarUrl),
        ];
        return this.loadImageUrls(urls).then(() => this.renderFriends(data, message));
      })
      .catch((err) => this.renderFriends({}, err.response?.data?.message || err.message || 'Ошибка загрузки'));
  }

  renderFriends(data = {}, message = '') {
    this.clearScene();
    this.drawBackground('Друзья');
    this.addBackButton();
    this.addDomForm(250, 135, `
      <form class="phaser-form phaser-form-inline">
        <input name="username" placeholder="Username друга" required />
        <button type="submit">Отправить заявку</button>
      </form>
    `, async (values) => {
      try {
        await api.post('/api/friends/requests', { username: values.username.trim() });
        this.loadFriends('Заявка отправлена');
      } catch (err) {
        this.renderFriends(data, err.response?.data?.message || err.message || 'Не удалось отправить заявку');
      }
    });
    if (message) this.addMessage(message, message.includes('Не') || message.includes('Ошибка') ? '#ffb3b3' : palette.text, 655);

    const rows = [
      ...(data.friends || []).map((x) => ({ kind: 'Друг', name: x.username, online: x.online, avatarUrl: x.avatarUrl })),
      ...(data.incoming || []).map((x) => ({ kind: 'Входящая заявка', name: x.fromUsername || x.username, id: x.id, incoming: true, avatarUrl: x.avatarUrl })),
      ...(data.outgoing || []).map((x) => ({ kind: 'Исходящая заявка', name: x.toUsername || x.username, avatarUrl: x.avatarUrl })),
    ];
    rows.slice(0, 14).forEach((row, index) => {
      const y = 230 + index * 34;
      this.addAvatar(96, y + 10, row.avatarUrl, row.name, 28);
      this.add.text(120, y, `${row.kind}: ${row.name}${row.online ? ' онлайн' : ''}`, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '18px',
        color: row.online ? '#9cffb5' : palette.text,
      });
      if (row.incoming) {
        this.addButton(760, y + 12, 120, 28, 'Принять', () => this.friendAction(row.id, 'accept'), { fontSize: 14, fill: 0x28543a, stroke: palette.ok });
        this.addButton(900, y + 12, 120, 28, 'Отклонить', () => this.friendAction(row.id, 'decline'), { fontSize: 14, fill: 0x52303a, stroke: palette.danger });
      }
    });
  }

  async friendAction(id, action) {
    await api.post(`/api/friends/requests/${id}/${action}`);
    this.loadFriends('Готово');
  }
}

class NotificationsScene extends ListScene {
  constructor() {
    super('NotificationsScene', 'Уведомления', async () => [], () => '');
  }

  create() {
    this.loadNotifications();
  }

  loadNotifications(message = '') {
    this.drawBackground('Уведомления');
    this.addBackButton();
    this.addMessage('Загрузка уведомлений...', palette.text, 120);
    api.get('/api/notifications')
      .then(({ data }) => this.renderNotifications(data || [], message))
      .catch((err) => this.renderNotifications([], err.response?.data?.message || err.message || 'Ошибка загрузки'));
  }

  renderNotifications(items, message = '') {
    this.clearScene();
    this.drawBackground('Уведомления');
    this.addBackButton();
    if (message) this.addMessage(message, message.includes('Ошибка') ? '#ffb3b3' : palette.text, 655);
    items.slice(0, 12).forEach((n, index) => {
      const y = 130 + index * 44;
      this.add.rectangle(GAME_WIDTH / 2, y + 12, 980, 36, n.read ? 0x1d2536 : 0x303f60, 0.94).setStrokeStyle(1, n.read ? 0x34445f : palette.primary);
      this.add.text(170, y, `${n.read ? 'Прочитано' : 'Новое'}  ${n.title || n.type}: ${n.message || ''}`, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '16px',
        color: palette.text,
        wordWrap: { width: 760 },
      });
      if (!n.read) {
        this.addButton(1030, y + 12, 130, 28, 'Прочитать', async () => {
          await api.post(`/api/notifications/${n.id}/read`);
          this.loadNotifications('Отмечено как прочитанное');
        }, { fontSize: 14 });
      }
    });
  }
}

class ReplaysScene extends ListScene {
  constructor() {
    super('ReplaysScene', 'Реплеи', async () => [], () => '');
  }

  create() {
    this.drawBackground('Реплеи');
    this.addBackButton();
    this.addMessage('Загрузка матчей...', palette.text, 120);
    api.get('/api/matches')
      .then(({ data }) => this.renderReplays((data || []).filter((m) => m.status === 'FINISHED')))
      .catch((err) => this.renderReplays([], err.response?.data?.message || err.message || 'Ошибка загрузки'));
  }

  renderReplays(matches, error = '') {
    this.clearScene();
    this.drawBackground('Реплеи');
    this.addBackButton();
    if (error) this.addMessage(error, '#ffb3b3', 120);
    matches.slice(0, 12).forEach((match, index) => {
      const y = 130 + index * 42;
      const row = this.add.rectangle(GAME_WIDTH / 2, y + 12, 900, 34, palette.panel, 0.94)
        .setStrokeStyle(1, 0x53627a)
        .setInteractive({ useHandCursor: true });
      this.add.text(210, y, `Матч #${match.id} — ${match.matchMode}, победитель: ${match.winnerId || 'ничья'}`, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '17px',
        color: palette.text,
      });
      row.on('pointerdown', () => {
        window.history.pushState({}, '', `/replay/${match.id}`);
        this.scene.start('ReplayViewerScene', { matchId: match.id });
      });
    });
  }
}

class ReplayViewerScene extends BaseScene {
  constructor() {
    super('ReplayViewerScene');
  }

  create(data = {}) {
    this.matchId = data.matchId || this.matchIdFromPath();
    this.stepIndex = 0;
    this.drawBackground('Реплей');
    this.addBackButton('ReplaysScene');
    this.addMessage('Загрузка реплея...', palette.text, 120);
    Promise.all([
      api.get(`/api/matches/${this.matchId}/replay`).then(({ data: steps }) => steps || []),
      api.get('/api/cards').then(({ data: cards }) => asArray(cards)),
    ]).then(([steps, cards]) => {
      this.steps = steps;
      this.cards = cards;
      return this.loadCardTextures(cards);
    }).then(() => this.renderReplay()).catch((err) => this.renderError(err.response?.data?.message || err.message || 'Ошибка реплея'));
  }

  matchIdFromPath() {
    const match = window.location.pathname.match(/^\/replay\/(\d+)/);
    return match ? Number(match[1]) : null;
  }

  getCard(type, id) {
    return this.cards.find((c) => c.cardType === type && c.id === id);
  }

  renderError(message) {
    this.clearScene();
    this.drawBackground('Реплей');
    this.addBackButton('ReplaysScene');
    this.addMessage(message, '#ffb3b3', GAME_HEIGHT / 2);
  }

  renderReplay() {
    this.clearScene();
    this.drawBackground(`Реплей #${this.matchId}`);
    this.addBackButton('ReplaysScene');
    const step = this.steps[this.stepIndex];
    if (!step?.gameState) {
      this.addMessage('В реплее нет шагов', palette.text, GAME_HEIGHT / 2);
      return;
    }
    this.add.text(GAME_WIDTH / 2, 92, `${this.stepIndex + 1}/${this.steps.length}: ${step.description || step.actionType}`, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '20px',
      color: palette.text,
      wordWrap: { width: 900 },
      align: 'center',
    }).setOrigin(0.5);
    this.renderReplayPlayer(step.gameState.player1, 180);
    this.renderReplayPlayer(step.gameState.player2, 430);
    this.addButton(500, 660, 140, 40, 'Шаг назад', () => {
      this.stepIndex = Math.max(0, this.stepIndex - 1);
      this.renderReplay();
    });
    this.addButton(780, 660, 140, 40, 'Шаг вперёд', () => {
      this.stepIndex = Math.min(this.steps.length - 1, this.stepIndex + 1);
      this.renderReplay();
    });
  }

  renderReplayPlayer(player, y) {
    this.add.text(80, y - 52, `${player.heroName || 'Герой'}  HP ${player.health}  Mana ${player.mana}`, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '18px',
      color: palette.text,
    });
    (player.board || []).slice(0, 7).forEach((minion, index) => {
      const source = this.getCard('MINION', minion.cardId) || {};
      new CardGameObject(this, 250 + index * 115, y, { ...source, ...minion, health: minion.currentHealth }, { width: 96, height: 132 });
    });
  }
}

class AdminScene extends ListScene {
  constructor() {
    super('AdminScene', 'Админка', async () => [], () => '');
  }

  create() {
    this.selected = null;
    this.loadAdmin();
  }

  loadAdmin(message = '') {
    this.drawBackground('Админка');
    this.addBackButton();
    this.addMessage('Загрузка админки...', palette.text, 120);
    Promise.all([
      api.get('/api/cards').then(({ data }) => data || []),
      api.get('/api/heroes').then(({ data }) => data || []),
    ]).then(([cards, heroes]) => this.loadCardTextures(cards).then(() => {
      this.cards = cards;
      this.heroes = heroes;
      this.renderAdmin(message);
    })).catch((err) => this.renderAdmin(err.response?.data?.message || err.message || 'Ошибка загрузки'));
  }

  renderAdmin(message = '') {
    this.clearScene();
    this.drawBackground('Админка');
    this.addBackButton();
    if (message) this.addMessage(message, message.includes('Ошибка') || message.includes('Не') ? '#ffb3b3' : palette.text, 670);
    this.add.text(80, 95, 'Карты: клик для редактирования', { fontFamily: 'Segoe UI, Arial', fontSize: '18px', color: palette.muted });
    (this.cards || []).slice(0, 18).forEach((card, index) => {
      const x = 90 + (index % 9) * 90;
      const y = 180 + Math.floor(index / 9) * 145;
      const view = new CardGameObject(this, x, y, card, {
        width: 76,
        height: 108,
        selected: this.selected && this.selected.id === card.id && this.selected.cardType === card.cardType,
      });
      view.on('pointerdown', () => {
        this.selected = card;
        this.renderAdmin();
      });
    });

    this.addPanel(1000, 250, 420, 350);
    if (this.selected) {
      this.renderSelectedCardForm(this.selected);
    } else {
      this.add.text(810, 135, 'Выберите карту слева', { fontFamily: 'Segoe UI, Arial', fontSize: '20px', color: palette.text });
    }

    this.renderCreateForms();
  }

  renderSelectedCardForm(card) {
    const isMinion = card.cardType === 'MINION';
    this.addDomForm(1000, 250, `
      <form class="phaser-form admin-phaser-form">
        <strong>${escapeAttr(card.cardType)} #${card.id}</strong>
        <input name="name" placeholder="Название" value="${escapeAttr(card.name)}" required />
        <input name="manaCost" type="number" placeholder="Мана" value="${escapeAttr(card.manaCost)}" />
        ${isMinion ? `
          <input name="attack" type="number" placeholder="Атака" value="${escapeAttr(card.attack)}" />
          <input name="health" type="number" placeholder="Здоровье" value="${escapeAttr(card.health)}" />
        ` : `
          <input name="damage" type="number" placeholder="Урон" value="${escapeAttr(card.damage)}" />
        `}
        <input name="description" placeholder="Описание" value="${escapeAttr(card.description)}" />
        <button type="submit">Сохранить карту</button>
      </form>
    `, (values) => this.saveCard(card, values));

    const uploadDom = this.addDomForm(1000, 500, `
      <form class="phaser-form admin-phaser-form">
        <input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" />
        <input name="sound" type="file" accept="audio/*" />
        <input name="effect" type="file" accept="image/gif,video/webm,video/mp4,image/png,image/webp" />
        <button type="submit">Загрузить ассеты</button>
      </form>
    `, () => {});

    const uploadNode = uploadDom.node?.querySelector('form');
    uploadNode?.addEventListener('submit', (event) => {
      event.preventDefault();
      this.uploadCardAssets(card, uploadNode);
    });

    this.addButton(1000, 625, 190, 34, 'Удалить карту', () => this.deleteCard(card), { fill: 0x52303a, stroke: palette.danger, fontSize: 15 });
  }

  renderCreateForms() {
    this.addDomForm(270, 595, `
      <form class="phaser-form admin-create-form">
        <strong>Создать карту</strong>
        <select name="cardType"><option value="MINION">Миньон</option><option value="SPELL">Заклинание</option></select>
        <input name="name" placeholder="Название" required />
        <input name="manaCost" type="number" placeholder="Мана" value="1" />
        <input name="attack" type="number" placeholder="Атака миньона" value="1" />
        <input name="health" type="number" placeholder="HP миньона" value="1" />
        <input name="damage" type="number" placeholder="Урон заклинания" value="1" />
        <input name="description" placeholder="Описание" />
        <button type="submit">Создать</button>
      </form>
    `, (values) => this.createCard(values));

    this.addDomForm(620, 595, `
      <form class="phaser-form admin-create-form">
        <strong>Создать героя</strong>
        <input name="id" placeholder="hero_id" required />
        <input name="name" placeholder="Имя" required />
        <input name="title" placeholder="Титул" />
        <input name="startingHealth" type="number" placeholder="HP" value="30" />
        <button type="submit">Создать героя</button>
      </form>
    `, (values) => this.createHero(values));
  }

  async saveCard(card, values) {
    try {
      const isMinion = card.cardType === 'MINION';
      const payload = isMinion
        ? {
            name: values.name,
            manaCost: Number(values.manaCost) || 0,
            attack: Number(values.attack) || 0,
            health: Number(values.health) || 1,
            description: values.description || '',
          }
        : {
            name: values.name,
            manaCost: Number(values.manaCost) || 0,
            damage: Number(values.damage) || 0,
            description: values.description || '',
          };
      const path = isMinion ? `/api/admin/cards/minions/${card.id}` : `/api/admin/cards/spells/${card.id}`;
      const { data } = await api.put(path, payload);
      this.cards = this.cards.map((c) => (c.id === data.id && c.cardType === data.cardType ? data : c));
      this.selected = data;
      this.renderAdmin('Карта сохранена');
    } catch (err) {
      this.renderAdmin(err.response?.data?.message || err.message || 'Не удалось сохранить карту');
    }
  }

  async createCard(values) {
    try {
      const isMinion = values.cardType === 'MINION';
      const payload = isMinion
        ? {
            name: values.name,
            manaCost: Number(values.manaCost) || 0,
            attack: Number(values.attack) || 0,
            health: Number(values.health) || 1,
            description: values.description || '',
          }
        : {
            name: values.name,
            manaCost: Number(values.manaCost) || 0,
            damage: Number(values.damage) || 0,
            description: values.description || '',
          };
      const { data } = await api.post(isMinion ? '/api/admin/cards/minions' : '/api/admin/cards/spells', payload);
      this.cards = [...this.cards, data];
      this.selected = data;
      await this.loadCardTextures([data]);
      this.renderAdmin('Карта создана');
    } catch (err) {
      this.renderAdmin(err.response?.data?.message || err.message || 'Не удалось создать карту');
    }
  }

  async createHero(values) {
    try {
      await api.post('/api/admin/heroes', {
        id: values.id.trim().toLowerCase(),
        name: values.name.trim(),
        title: values.title?.trim() || '',
        startingHealth: Number(values.startingHealth) || 30,
      });
      this.renderAdmin('Герой создан');
    } catch (err) {
      this.renderAdmin(err.response?.data?.message || err.message || 'Не удалось создать героя');
    }
  }

  async deleteCard(card) {
    try {
      const isMinion = card.cardType === 'MINION';
      await api.delete(isMinion ? `/api/admin/cards/minions/${card.id}` : `/api/admin/cards/spells/${card.id}`);
      this.cards = this.cards.filter((c) => !(c.id === card.id && c.cardType === card.cardType));
      this.selected = null;
      this.renderAdmin('Карта удалена');
    } catch (err) {
      this.renderAdmin(err.response?.data?.message || err.message || 'Не удалось удалить карту');
    }
  }

  async uploadCardAssets(card, form) {
    try {
      const isMinion = card.cardType === 'MINION';
      const uploads = [
        ['image', form.elements.image?.files?.[0], isMinion ? `/api/cards/minions/${card.id}/image` : `/api/cards/spells/${card.id}/image`, 'image'],
        ['sound', form.elements.sound?.files?.[0], isMinion ? `/api/cards/minions/${card.id}/sound` : `/api/cards/spells/${card.id}/sound`, 'sound'],
        ['effect', form.elements.effect?.files?.[0], isMinion ? `/api/cards/minions/${card.id}/play-effect` : `/api/cards/spells/${card.id}/play-effect`, 'effect'],
      ].filter(([, file]) => file);
      for (const [, file, endpoint, field] of uploads) {
        const fd = new FormData();
        fd.append(field, file);
        await api.post(endpoint, fd);
      }
      this.loadAdmin('Ассеты загружены');
    } catch (err) {
      this.renderAdmin(err.response?.data?.message || err.message || 'Не удалось загрузить ассеты');
    }
  }
}

class CardGameObject extends Phaser.GameObjects.Container {
  constructor(scene, x, y, card, options = {}) {
    super(scene, x, y);
    this.card = card;
    this.options = options;
    this.w = options.width || 105;
    this.h = options.height || 145;
    this.build();
    scene.add.existing(this);
  }

  build() {
    const isMinion = this.card?.cardType === 'MINION';
    const compact = this.h < 125 || this.w < 90;
    const manaRadius = compact ? 10 : 14;
    const statRadius = compact ? 10 : 14;
    const artHeight = compact ? Math.max(24, this.h - 50) : this.h - 48;
    const artY = compact ? -this.h * 0.18 : -18;
    const nameY = compact ? this.h / 2 - 30 : 33;
    const bg = this.scene.add.rectangle(0, 0, this.w, this.h, 0x26324a, 1)
      .setStrokeStyle(2, this.options.selected ? palette.primary : 0x5c6f95);
    this.add(bg);

    const key = textureKey(this.card);
    if (this.card?.imageUrl && this.scene.textures.exists(key)) {
      const art = this.scene.add.image(0, artY, key).setDisplaySize(this.w - 12, artHeight);
      this.add(art);
    } else {
      const fallback = this.scene.add.rectangle(0, artY, this.w - 12, artHeight, 0x35415a, 0.9);
      this.add(fallback);
    }

    const mana = this.scene.add.circle(-this.w / 2 + manaRadius, -this.h / 2 + manaRadius, manaRadius, 0x235bd6)
      .setStrokeStyle(2, 0xc9d6ff);
    const manaText = this.scene.add.text(mana.x, mana.y, String(this.card?.manaCost ?? 0), {
      fontFamily: 'Segoe UI, Arial',
      fontSize: compact ? '11px' : '17px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add([mana, manaText]);

    this.add(this.scene.add.text(0, nameY, this.card?.name || 'Карта', {
      fontFamily: 'Segoe UI, Arial',
      fontSize: compact ? '9px' : '13px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: this.w - 12 },
    }).setOrigin(0.5));

    const desc = this.card?.description || '';
    if (desc && !compact) {
      this.add(this.scene.add.text(0, 62, desc, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '10px',
        color: '#d7dfef',
        align: 'center',
        wordWrap: { width: this.w - 14 },
      }).setOrigin(0.5, 0));
    }

    if (isMinion) {
      this.addStat(-this.w / 2 + statRadius + 3, this.h / 2 - statRadius - 3, this.card?.attack ?? 0, 0xb33a32, statRadius);
      this.addStat(this.w / 2 - statRadius - 3, this.h / 2 - statRadius - 3, this.card?.health ?? this.card?.currentHealth ?? 0, 0x2e9a58, statRadius);
    } else {
      this.addStat(this.w / 2 - statRadius - 3, this.h / 2 - statRadius - 3, this.card?.damage ?? 0, 0x8a47cf, statRadius);
    }

    this.setSize(this.w, this.h);
    this.setInteractive(new Phaser.Geom.Rectangle(-this.w / 2, -this.h / 2, this.w, this.h), Phaser.Geom.Rectangle.Contains);
  }

  addStat(x, y, value, color, radius = 14) {
    const circle = this.scene.add.circle(x, y, radius, color).setStrokeStyle(2, 0xffffff);
    const text = this.scene.add.text(x, y, String(value), {
      fontFamily: 'Segoe UI, Arial',
      fontSize: radius <= 10 ? '10px' : '15px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add([circle, text]);
  }

  playCardEffect() {
    this.scene.tweens.add({
      targets: this,
      scale: { from: 1.18, to: 1 },
      angle: { from: -4, to: 0 },
      duration: 260,
      ease: 'Back.Out',
    });
    this.spawnBurst(palette.primary);
  }

  playHitEffect() {
    this.scene.tweens.add({
      targets: this,
      x: this.x + 8,
      yoyo: true,
      repeat: 3,
      duration: 45,
      ease: 'Sine.InOut',
    });
    this.spawnBurst(palette.danger);
  }

  spawnBurst(color) {
    const particles = [];
    for (let i = 0; i < 10; i += 1) {
      const dot = this.scene.add.circle(this.x, this.y, 4, color, 0.95);
      particles.push(dot);
      this.scene.tweens.add({
        targets: dot,
        x: this.x + Phaser.Math.Between(-70, 70),
        y: this.y + Phaser.Math.Between(-70, 70),
        alpha: 0,
        scale: 0.2,
        duration: 420,
        ease: 'Cubic.Out',
        onComplete: () => dot.destroy(),
      });
    }
    return particles;
  }
}

class PlayScene extends BaseScene {
  constructor() {
    super('PlayScene');
  }

  create() {
    this.drawBackground('Поиск матча');
    this.addBackButton();
    this.addMessage('Загрузка колод и героев...', palette.text, GAME_HEIGHT / 2);
    this.mode = 'RANKED';
    this.selectedDeckIndex = 0;
    this.selectedHeroIndex = 0;
    Promise.all([
      api.get('/api/decks').then(({ data }) => data || []),
      api.get('/api/cards').then(({ data }) => data || []),
      api.get('/api/heroes').then(({ data }) => data || []),
    ]).then(([decks, cards, heroes]) => {
      this.decks = decks;
      this.cards = cards;
      this.heroes = heroes.filter((h) => h.unlocked !== false);
      const heroIndex = this.heroes.findIndex((h) => h.id === session.selectedHeroId);
      this.selectedHeroIndex = Math.max(0, heroIndex);
      this.render();
    }).catch((err) => this.renderError(err.response?.data?.message || err.message || 'Ошибка загрузки'));
  }

  renderError(message) {
    this.clearScene();
    this.drawBackground('Поиск матча');
    this.addBackButton();
    this.addMessage(message, '#ffb3b3', GAME_HEIGHT / 2);
  }

  render(status = '') {
    this.clearScene();
    this.drawBackground('Поиск матча');
    this.addBackButton();
    this.addPanel(GAME_WIDTH / 2, 360, 760, 450);
    const hero = this.heroes[this.selectedHeroIndex];
    const decks = hero ? this.decks.filter((d) => deckHeroId(d) === hero.id) : [];
    const deck = decks[this.selectedDeckIndex] || decks[0];

    this.add.text(GAME_WIDTH / 2, 180, `Герой: ${hero?.name || 'нет доступных героев'}`, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '24px',
      color: palette.text,
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 235, `Колода: ${deck?.name || 'нет колоды для героя'}`, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '22px',
      color: deck ? palette.text : '#ffb3b3',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 285, `Режим: ${this.mode}`, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '20px',
      color: palette.muted,
    }).setOrigin(0.5);

    this.addButton(440, 360, 170, 44, 'Герой +', () => {
      this.selectedHeroIndex = (this.selectedHeroIndex + 1) % Math.max(1, this.heroes.length);
      session.selectedHeroId = this.heroes[this.selectedHeroIndex]?.id || DEFAULT_HERO_ID;
      localStorage.setItem('lotus_selected_hero_id', session.selectedHeroId);
      this.selectedDeckIndex = 0;
      this.render();
    });
    this.addButton(640, 360, 170, 44, 'Колода +', () => {
      this.selectedDeckIndex = (this.selectedDeckIndex + 1) % Math.max(1, decks.length);
      this.render();
    });
    this.addButton(840, 360, 170, 44, 'Режим', () => {
      this.mode = this.mode === 'RANKED' ? 'CASUAL' : 'RANKED';
      this.render();
    });
    this.addButton(GAME_WIDTH / 2, 460, 260, 56, 'Найти матч', () => this.findMatch(deck, hero), {
      fill: palette.primaryDark,
      stroke: palette.primary,
      fontSize: 22,
    });
    if (status) this.addMessage(status, palette.text, 555);
  }

  async findMatch(deck, hero) {
    if (!deck || !hero) {
      this.render('Выберите героя и колоду.');
      return;
    }
    this.render('Поиск соперника...');
    try {
      let match;
      try {
        match = await matchSocket.findMatch(deck.id, this.mode, hero.id);
      } catch {
        const { data } = await api.post('/api/matches/find', null, {
          params: { deckId: deck.id, mode: this.mode, heroId: hero.id },
        });
        match = data;
      }
      sessionStorage.setItem(ACTIVE_MATCH_KEY, String(match.id));
      if (match.status === 'WAITING') {
        this.waitForMatch(match.id);
      } else {
        this.scene.start('MatchScene', { match, cards: this.cards });
      }
    } catch (err) {
      this.render(err.response?.data?.message || err.message || 'Не удалось найти матч');
    }
  }

  waitForMatch(matchId) {
    this.render(`Ожидание соперника. Матч #${matchId}`);
    this.time.addEvent({
      delay: 2000,
      loop: true,
      callback: async (event) => {
        const { data } = await api.get(`/api/matches/${matchId}`);
        if (data.status !== 'WAITING') {
          event.remove();
          this.scene.start('MatchScene', { match: data, cards: this.cards });
        }
      },
    });
  }
}

class MatchScene extends BaseScene {
  constructor() {
    super('MatchScene');
  }

  init(data = {}) {
    this.match = data.match || null;
    this.cards = data.cards || [];
    this.cardViews = new Map();
    this.selectedAttacker = null;
    this.selectedSpell = null;
    this.unsubscribeMatch = null;
    this.unsubscribeErrors = null;
  }

  create() {
    this.loadData().then(() => this.prepareAssets()).then(() => {
      this.connectSocket();
      this.render();
    }).catch((err) => this.renderError(err.response?.data?.message || err.message || 'Ошибка матча'));
  }

  shutdown() {
    this.unsubscribeMatch?.();
    this.unsubscribeErrors?.();
  }

  async loadData() {
    if (!this.match) {
      const id = sessionStorage.getItem(ACTIVE_MATCH_KEY);
      if (id) {
        const { data } = await api.get(`/api/matches/${id}`);
        this.match = data;
      }
    }
    if (!this.cards.length) {
      const { data } = await api.get('/api/cards');
      this.cards = data || [];
    }
  }

  prepareAssets() {
    const toLoad = this.cards.filter((c) => c.imageUrl && !this.textures.exists(textureKey(c)));
    if (!toLoad.length) return Promise.resolve();
    return new Promise((resolve) => {
      toLoad.forEach((card) => this.load.image(textureKey(card), card.imageUrl));
      this.load.once('complete', resolve);
      this.load.start();
    });
  }

  connectSocket() {
    if (!this.match?.id) return;
    matchSocket.connect().then(() => {
      this.unsubscribeMatch = matchSocket.subscribeMatch(this.match.id, (match) => {
        const previous = this.match;
        this.match = match;
        this.render(previous);
      });
      this.unsubscribeErrors = matchSocket.subscribeErrors((err) => this.addMessage(err.message, '#ffb3b3'));
    }).catch(() => {
      this.time.addEvent({
        delay: 5000,
        loop: true,
        callback: async () => {
          if (this.match?.status !== 'IN_PROGRESS') return;
          const { data } = await api.get(`/api/matches/${this.match.id}`);
          this.match = data;
          this.render();
        },
      });
    });
  }

  getCard(type, id) {
    return this.cards.find((c) => c.cardType === type && c.id === id);
  }

  renderError(message) {
    this.clearScene();
    this.drawBackground('Матч');
    this.addBackButton('PlayScene');
    this.addMessage(message, '#ffb3b3', GAME_HEIGHT / 2);
  }

  render(previous) {
    this.clearScene();
    this.cardViews.clear();
    this.drawBackground(`Матч #${this.match?.id || ''}`);
    this.addButton(80, 675, 120, 40, 'Выход', () => this.scene.start('PlayScene'), { fontSize: 16 });
    if (!this.match?.gameState) {
      this.addMessage('Ожидание начала...', palette.text, GAME_HEIGHT / 2);
      return;
    }

    const isPlayer1 = this.match.player1Id === session.user?.id;
    const me = isPlayer1 ? this.match.gameState.player1 : this.match.gameState.player2;
    const enemy = isPlayer1 ? this.match.gameState.player2 : this.match.gameState.player1;
    const isMyTurn = this.match.currentTurnPlayerId === session.user?.id;

    this.renderHero(160, 138, enemy, false);
    this.renderHero(160, 575, me, true);
    this.renderBoard(enemy, 430, 180, false, isMyTurn);
    this.renderBoard(me, 430, 430, true, isMyTurn);
    this.renderHand(me, isMyTurn);

    this.add.text(GAME_WIDTH / 2, 345, isMyTurn ? 'Ваш ход' : 'Ход соперника', {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '24px',
      color: isMyTurn ? '#ffe18c' : palette.muted,
    }).setOrigin(0.5);

    if (isMyTurn) {
      this.addButton(1140, 350, 160, 48, 'Конец хода', () => this.endTurn(), { fill: palette.primaryDark });
    }

    if (this.match.status === 'FINISHED') {
      const result = this.match.winnerId === session.user?.id ? 'Победа!' : this.match.winnerId ? 'Поражение' : 'Ничья';
      this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 500, 180, 0x000000, 0.78);
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, result, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '46px',
        color: this.match.winnerId === session.user?.id ? '#99ffb0' : '#ffb3b3',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      sessionStorage.removeItem(ACTIVE_MATCH_KEY);
    }

    this.animateDiff(previous);
  }

  renderHero(x, y, state, mine) {
    const canTarget = !mine && (this.selectedAttacker || this.selectedSpell) && !(state.board || []).length;
    const hero = this.add.container(x, y);
    const rect = this.add.rectangle(0, 0, 230, 76, canTarget ? 0x513a22 : palette.panel2, 0.95)
      .setStrokeStyle(2, canTarget ? palette.primary : 0x53627a);
    const label = this.add.text(-92, -22, state.heroName || (mine ? 'Я' : 'Соперник'), {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '18px',
      color: palette.text,
    });
    const hp = this.add.text(-92, 10, `HP ${state.health}${state.maxHeroHealth ? `/${state.maxHeroHealth}` : ''}  Mana ${state.mana ?? '-'}`, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '15px',
      color: palette.muted,
    });
    hero.add([rect, label, hp]);
    if (canTarget) {
      rect.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.useTarget('hero'));
    }
  }

  renderBoard(state, startX, y, mine, isMyTurn) {
    (state.board || []).forEach((minion, index) => {
      const source = this.getCard('MINION', minion.cardId) || {};
      const card = { ...source, ...minion, health: minion.currentHealth };
      const view = new CardGameObject(this, startX + index * 118, y, card, {
        selected: this.selectedAttacker === minion.instanceId,
      });
      this.cardViews.set(minion.instanceId, view);
      if (mine && isMyTurn && minion.canAttack) {
        view.on('pointerdown', () => {
          this.selectedAttacker = this.selectedAttacker === minion.instanceId ? null : minion.instanceId;
          this.selectedSpell = null;
          this.render();
        });
      }
      if (!mine && (this.selectedAttacker || this.selectedSpell) && !minion.stealth) {
        view.on('pointerdown', () => this.useTarget(minion.instanceId));
      }
    });
  }

  renderHand(me, isMyTurn) {
    (me.hand || []).forEach((slot, index) => {
      const card = this.getCard(slot.cardType, slot.cardId);
      if (!card) return;
      const x = 390 + index * 95;
      const view = new CardGameObject(this, x, 612, card, {
        width: 86,
        height: 122,
        selected: this.selectedSpell?.instanceId === slot.instanceId,
      });
      this.cardViews.set(slot.instanceId, view);
      const hasMana = me.mana >= (card.manaCost ?? 0);
      const boardFull = (me.board || []).length >= 7;
      const canPlay = isMyTurn && hasMana && (slot.cardType === 'SPELL' || !boardFull);
      view.setAlpha(canPlay ? 1 : 0.48);
      if (canPlay) {
        view.on('pointerdown', () => {
          if (slot.cardType === 'SPELL' && (card.damage || 0) > 0) {
            this.selectedSpell = this.selectedSpell?.instanceId === slot.instanceId ? null : { ...slot, card };
            this.selectedAttacker = null;
            this.render();
          } else {
            view.playCardEffect();
            this.playCard(slot.instanceId, (me.board || []).length, null);
          }
        });
      }
    });
  }

  async playCard(instanceId, targetPosition, targetInstanceId) {
    try {
      if (matchSocket.client?.connected) {
        matchSocket.publish(`/app/matches/${this.match.id}/play`, { instanceId, targetPosition, targetInstanceId });
      } else {
        const { data } = await api.post(`/api/matches/${this.match.id}/play`, { instanceId, targetPosition, targetInstanceId });
        this.match = data;
        this.render();
      }
    } catch (err) {
      this.addMessage(err.response?.data?.message || err.message || 'Ошибка розыгрыша', '#ffb3b3');
    }
  }

  async attack(attackerInstanceId, targetInstanceId) {
    try {
      this.cardViews.get(attackerInstanceId)?.playCardEffect();
      if (targetInstanceId !== 'hero') this.cardViews.get(targetInstanceId)?.playHitEffect();
      if (matchSocket.client?.connected) {
        matchSocket.publish(`/app/matches/${this.match.id}/attack`, { attackerInstanceId, targetInstanceId });
      } else {
        const { data } = await api.post(`/api/matches/${this.match.id}/attack`, { attackerInstanceId, targetInstanceId });
        this.match = data;
        this.render();
      }
    } catch (err) {
      this.addMessage(err.response?.data?.message || err.message || 'Ошибка атаки', '#ffb3b3');
    }
  }

  useTarget(targetInstanceId) {
    if (this.selectedAttacker) {
      const attacker = this.selectedAttacker;
      this.selectedAttacker = null;
      this.attack(attacker, targetInstanceId);
      return;
    }
    if (this.selectedSpell) {
      const spell = this.selectedSpell;
      this.selectedSpell = null;
      this.playCard(spell.instanceId, null, targetInstanceId);
    }
  }

  async endTurn() {
    try {
      if (matchSocket.client?.connected) {
        matchSocket.publish(`/app/matches/${this.match.id}/end-turn`);
      } else {
        const { data } = await api.post(`/api/matches/${this.match.id}/end-turn`);
        this.match = data;
        this.render();
      }
    } catch (err) {
      this.addMessage(err.response?.data?.message || err.message || 'Ошибка завершения хода', '#ffb3b3');
    }
  }

  animateDiff(previous) {
    if (!previous?.gameState || !this.match?.gameState) return;
    const prevBoards = [
      ...(previous.gameState.player1?.board || []),
      ...(previous.gameState.player2?.board || []),
    ];
    const nextBoards = [
      ...(this.match.gameState.player1?.board || []),
      ...(this.match.gameState.player2?.board || []),
    ];
    nextBoards.forEach((next) => {
      const prev = prevBoards.find((x) => x.instanceId === next.instanceId);
      const view = this.cardViews.get(next.instanceId);
      if (!view) return;
      if (!prev) view.playCardEffect();
      else if (prev.currentHealth !== next.currentHealth) view.playHitEffect();
    });
  }
}

export function createLotusGame(parent) {
  return new Phaser.Game({
    type: Phaser.WEBGL,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#10141f',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    dom: {
      createContainer: true,
    },
    scene: [
      BootScene,
      AuthScene,
      MenuScene,
      PlayScene,
      MatchScene,
      HeroesScene,
      DecksScene,
      DeckEditorScene,
      ShopScene,
      ProfileScene,
      LeaderboardScene,
      ReplaysScene,
      ReplayViewerScene,
      FriendsScene,
      NotificationsScene,
      AdminScene,
    ],
  });
}
