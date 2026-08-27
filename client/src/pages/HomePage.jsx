import {
  GAME_HEIGHT,
  palette,
  session,
  layoutInfo,
  toggleTheme,
  toggleSound,
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

const RULES_HTML = `
  <div class="lotus-modal-overlay" data-rules-close>
    <div class="lotus-modal tutorial-modal" data-rules-card>
      <div class="lotus-modal-header">
        <h2>Правила игры</h2>
        <button type="button" class="lotus-modal-close" data-rules-close aria-label="Закрыть">×</button>
      </div>
      <div class="lotus-modal-body tutorial-scroll">
        <section>
          <h3>Цель игры</h3>
          <p>Снизьте HP героя соперника до 0, чтобы победить.</p>
        </section>
        <section>
          <h3>Мана</h3>
          <p>Каждая карта стоит определённое количество маны. В начале хода ваша мана восполняется. Используйте её, чтобы разыгрывать карты.</p>
        </section>
        <section>
          <h3>Разыгрывание карт</h3>
          <p>В свой ход вы можете сыграть миньона из руки, поместив его на стол. Нажмите на карту в руке, чтобы сыграть её.</p>
        </section>
        <section>
          <h3>Атака</h3>
          <p>Миньоны, которые могут атаковать, бьют сначала по выбору атакующего, затем цели. <strong>Героя нельзя атаковать, пока на столе соперника есть миньоны</strong> — сначала устраните их.</p>
        </section>
        <section>
          <h3>Ходы</h3>
          <p>Игроки ходят по очереди. В свой ход играйте карты и атакуйте. Нажмите «Конец хода», когда закончите.</p>
        </section>
      </div>
    </div>
  </div>`;

export class BootScene extends BaseScene {
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
    const layout = layoutInfo();
    this.drawBackground('Lotus Game');
    if (session.user) {
      ensureChatScene(this);
      ensureFriendOnlineScene(this);
    }
    this.addPanel(layout.centerX, layout.portrait ? 630 : 370, layout.portrait ? 560 : 620, layout.portrait ? 900 : 520);
    this.add.text(layout.centerX, layout.portrait ? 170 : 150, session.user ? `Добро пожаловать, ${session.user.username}` : 'Гость', {
      fontFamily: 'Segoe UI, Arial',
      fontSize: layout.portrait ? '26px' : '28px',
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
        this.addButton(layout.centerX, 250 + index * 62, 360, 46, label, () => this.goto(scene));
        return;
      }
      const col = index % 2;
      const row = Math.floor(index / 2);
      this.addButton(500 + col * 280, 220 + row * 62, 230, 44, label, () => this.goto(scene));
    });

    const utilY = layout.portrait ? GAME_HEIGHT - 170 : 575;
    const gap = layout.portrait ? 150 : 160;
    const startX = layout.centerX - gap;
    this.addButton(startX, utilY, 140, 40, 'Правила', () => this.openRules(), { fontSize: 15 });
    this.addButton(layout.centerX, utilY, 140, 40, session.soundEnabled ? 'Звук: вкл' : 'Звук: выкл', () => {
      toggleSound();
      playSound('click');
      this.scene.restart();
    }, { fontSize: 14 });
    this.addButton(layout.centerX + gap, utilY, 140, 40, session.theme === 'dark' ? 'Тема: тёмн.' : 'Тема: светл.', () => {
      toggleTheme();
      try {
        this.game.config.backgroundColor = `#${palette.bg.toString(16).padStart(6, '0')}`;
      } catch { /* ignore */ }
      this.scene.restart();
    }, { fontSize: 14 });

    this.addButton(layout.centerX, layout.portrait ? GAME_HEIGHT - 100 : 640, layout.portrait ? 300 : 220, 44, 'Выйти', () => {
      clearTokens();
      session.user = null;
      matchSocket.disconnect();
      stopChatScene(this);
      stopFriendOnlineScene(this);
      this.goto('AuthScene');
    }, { fill: 0x52303a, stroke: palette.danger });
  }

  openRules() {
    if (this._rulesDom) {
      try { this._rulesDom.destroy(true); } catch { /* ignore */ }
      this._rulesDom = null;
    }
    this._rulesDom = this.add.dom(layoutInfo().centerX, layoutInfo().centerY)
      .createFromHTML(`<div class="phaser-dom-wrap">${RULES_HTML}</div>`);
    this._rulesDom.setOrigin(0.5);
    this._rulesDom.setDepth(1500);
    if (typeof this._rulesDom.updateSize === 'function') this._rulesDom.updateSize();
    const root = this._rulesDom.node;
    root?.querySelectorAll('[data-rules-close]').forEach((el) => {
      el.addEventListener('click', (event) => {
        if (el.hasAttribute('data-rules-card')) return;
        event.preventDefault();
        try { this._rulesDom?.destroy(true); } catch { /* ignore */ }
        this._rulesDom = null;
      });
    });
    root?.querySelector('[data-rules-card]')?.addEventListener('click', (e) => e.stopPropagation());
  }
}
