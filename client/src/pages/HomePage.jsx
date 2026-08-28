import {
  GAME_WIDTH,
  GAME_HEIGHT,
  palette,
  session,
  layoutInfo,
  toggleTheme,
  toggleSound,
  applyTheme,
} from '../game/shared';
import { BaseScene } from '../components/TutorialModal';
import { sceneForCurrentRoute, authModeForCurrentRoute } from '../components/NavDropdown';
import {
  completeOAuthCallback,
  loadCurrentUser,
  ensureFriendOnlineScene,
  stopFriendOnlineScene,
} from '../components/FriendOnlinePopup';
import { matchSocket } from '../components/WaitingMatch';
import { ensureChatScene, stopChatScene } from '../components/ChatWidget';
import { clearTokens } from '../utils/tokenStorage';
import { playSound } from '../utils/sound';

const RULES_SECTIONS = [
  ['Цель игры', 'Снизьте HP героя соперника до 0, чтобы победить.'],
  ['Мана', 'Каждая карта стоит ману. В начале хода мана восполняется.'],
  ['Разыгрывание карт', 'В свой ход сыграйте миньона или заклинание из руки на стол.'],
  ['Атака', 'Выберите своего миньона, затем цель. Героя нельзя бить, пока на столе соперника есть миньоны.'],
  ['Ходы', 'Игроки ходят по очереди. Нажмите «Конец хода», когда закончите.'],
];

export class BootScene extends BaseScene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.image('lotus-logo', '/lotus.jpg');
    this.load.svg('lotus-logo-fallback', '/lotus.svg', { width: 256, height: 256 });
  }

  create() {
    applyTheme(session.theme);
    this.drawBackground('Lotus Game');
    this.addMessage('Загрузка профиля...', palette.text, GAME_HEIGHT / 2);

    const finish = (targetScene, data = {}) => {
      try {
        if (session.user) {
          ensureChatScene(this);
          ensureFriendOnlineScene(this);
        }
      } catch {
        // overlays must never block boot
      }
      this.scene.start(targetScene, data);
    };

    let bootAuthError = '';
    completeOAuthCallback()
      .catch((err) => {
        bootAuthError = err?.message || 'Ошибка входа через Google';
        return null;
      })
      .then(() => loadCurrentUser())
      .catch(() => {
        session.user = null;
        return null;
      })
      .then(() => {
        this.loadImageUrls([session.user?.avatarUrl]).catch(() => {});
        const targetScene = sceneForCurrentRoute();
        if (!session.user && !['AuthScene', 'LeaderboardScene'].includes(targetScene)) {
          finish('AuthScene', { mode: authModeForCurrentRoute(), error: bootAuthError });
          return;
        }
        finish(
          targetScene,
          targetScene === 'AuthScene'
            ? { mode: authModeForCurrentRoute(), error: bootAuthError }
            : {}
        );
      })
      .catch(() => {
        session.user = null;
        finish('AuthScene', { mode: 'login', error: bootAuthError });
      });
  }
}

export class MenuScene extends BaseScene {
  constructor() {
    super('MenuScene');
  }

  create() {
    applyTheme(session.theme);
    try {
      this.cameras.main.setBackgroundColor(palette.bg);
    } catch { /* ignore */ }

    const layout = layoutInfo();
    this.drawBackground('Lotus Game');
    if (session.user) {
      ensureChatScene(this);
      ensureFriendOnlineScene(this);
    }
    this.addPanel(layout.centerX, layout.portrait ? 560 : 370, layout.portrait ? 560 : 620, layout.portrait ? 720 : 520);
    this.add.text(layout.centerX, layout.portrait ? 160 : 150, session.user ? `Добро пожаловать, ${session.user.username}` : 'Гость', {
      fontFamily: 'Segoe UI, Arial',
      fontSize: layout.portrait ? '24px' : '28px',
      color: palette.text,
      align: 'center',
      wordWrap: { width: layout.portrait ? 520 : 760 },
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
      if (layout.portrait) {
        this.addButton(layout.centerX, 230 + index * 56, 360, 44, label, () => this.goto(scene));
        return;
      }
      const col = index % 2;
      const row = Math.floor(index / 2);
      this.addButton(500 + col * 280, 220 + row * 62, 230, 44, label, () => this.goto(scene));
    });

    // Utility row — keep above chat FAB / safe area on phones
    if (layout.portrait) {
      const utilY = GAME_HEIGHT - 210;
      this.addButton(layout.centerX - 170, utilY, 150, 48, 'Правила', () => this.openRules(), { fontSize: 16 });
      this.addButton(layout.centerX, utilY, 150, 48, session.soundEnabled ? 'Звук: вкл' : 'Звук: выкл', () => {
        this.toggleMenuSound();
      }, { fontSize: 15 });
      this.addButton(layout.centerX + 170, utilY, 150, 48, session.theme === 'dark' ? 'Тема: тёмн.' : 'Тема: светл.', () => {
        this.switchTheme();
      }, { fontSize: 15 });
      this.addButton(layout.centerX, GAME_HEIGHT - 130, 300, 48, 'Выйти', () => this.logout(), {
        fill: 0x52303a,
        stroke: palette.danger,
      });
    } else {
      const utilY = 575;
      this.addButton(layout.centerX - 160, utilY, 140, 40, 'Правила', () => this.openRules(), { fontSize: 15 });
      this.addButton(layout.centerX, utilY, 140, 40, session.soundEnabled ? 'Звук: вкл' : 'Звук: выкл', () => {
        this.toggleMenuSound();
      }, { fontSize: 14 });
      this.addButton(layout.centerX + 160, utilY, 140, 40, session.theme === 'dark' ? 'Тема: тёмн.' : 'Тема: светл.', () => {
        this.switchTheme();
      }, { fontSize: 14 });
      this.addButton(layout.centerX, 640, 220, 44, 'Выйти', () => this.logout(), {
        fill: 0x52303a,
        stroke: palette.danger,
      });
    }
  }

  switchTheme() {
    if (!this.consumeMenuAction()) return;
    toggleTheme();
    applyTheme(session.theme);
    try {
      this.cameras.main.setBackgroundColor(palette.bg);
      this.game.config.backgroundColor = `#${palette.bg.toString(16).padStart(6, '0')}`;
    } catch { /* ignore */ }
    playSound('click');
    this.scene.restart();
  }

  toggleMenuSound() {
    if (!this.consumeMenuAction()) return;
    toggleSound();
    playSound('click');
    this.scene.restart();
  }

  /** Extra guard so sound/theme/rules don't double-fire on iOS (touch + ghost mouse). */
  consumeMenuAction() {
    const now = performance.now();
    if (now - (this._menuActionAt || 0) < 450) return false;
    this._menuActionAt = now;
    return true;
  }

  logout() {
    clearTokens();
    session.user = null;
    matchSocket.disconnect();
    stopChatScene(this);
    stopFriendOnlineScene(this);
    this.goto('AuthScene');
  }

  closeRules() {
    if (this._rulesLayer) {
      try { this._rulesLayer.destroy(true); } catch { /* ignore */ }
      this._rulesLayer = null;
    }
  }

  openRules() {
    if (!this.consumeMenuAction()) return;
    this.closeRules();
    const layout = layoutInfo();
    const layer = this.add.container(0, 0);
    layer.setDepth(5000);

    const dim = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.72)
      .setInteractive();
    dim.on('pointerup', () => this.closeRules());

    const panelW = layout.portrait ? 620 : 640;
    const panelH = layout.portrait ? 900 : 520;
    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, panelW, panelH, palette.panel, 0.98)
      .setStrokeStyle(2, palette.primary);
    // swallow taps on panel so they don't close via dim
    panel.setInteractive();

    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - panelH / 2 + 36, 'Правила игры', {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '26px',
      color: palette.text,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const closeBtn = this.addButton(
      GAME_WIDTH / 2 + panelW / 2 - 36,
      GAME_HEIGHT / 2 - panelH / 2 + 36,
      52,
      44,
      '×',
      () => this.closeRules(),
      { fontSize: 28, fill: palette.panel2 },
    );

    const bodyTop = GAME_HEIGHT / 2 - panelH / 2 + 80;
    const lines = [];
    RULES_SECTIONS.forEach(([heading, text], index) => {
      const y = bodyTop + index * (layout.portrait ? 130 : 72);
      lines.push(this.add.text(GAME_WIDTH / 2 - panelW / 2 + 28, y, heading, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '18px',
        color: '#ffe18c',
        fontStyle: 'bold',
      }));
      lines.push(this.add.text(GAME_WIDTH / 2 - panelW / 2 + 28, y + 28, text, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '15px',
        color: palette.muted,
        wordWrap: { width: panelW - 56 },
      }));
    });

    const okBtn = this.addButton(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + panelH / 2 - 40,
      200,
      44,
      'Закрыть',
      () => this.closeRules(),
      { fill: palette.primaryDark, fontSize: 18 },
    );

    layer.add([dim, panel, title, closeBtn, okBtn, ...lines]);
    this._rulesLayer = layer;
  }
}
