import {
  GAME_HEIGHT,
  palette,
  session,
  layoutInfo,
} from '../game/shared';
import { BaseScene } from '../components/TutorialModal';
import { sceneForCurrentRoute, authModeForCurrentRoute } from '../components/NavDropdown';
import { completeOAuthCallback, loadCurrentUser } from '../components/FriendOnlinePopup';
import { matchSocket } from '../components/WaitingMatch';
import { ensureChatScene, stopChatScene } from '../components/ChatWidget';
import { clearTokens } from '../utils/tokenStorage';

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
      if (session.user) ensureChatScene(this);
      this.scene.start(targetScene, targetScene === 'AuthScene' ? { mode: authModeForCurrentRoute() } : {});
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
    if (session.user) ensureChatScene(this);
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
        this.addButton(layout.centerX, 260 + index * 66, 360, 48, label, () => this.goto(scene));
        return;
      }
      const col = index % 2;
      const row = Math.floor(index / 2);
      this.addButton(500 + col * 280, 230 + row * 66, 230, 46, label, () => this.goto(scene));
    });
    this.addButton(layout.centerX, layout.portrait ? GAME_HEIGHT - 110 : 620, layout.portrait ? 300 : 220, 44, 'Выйти', () => {
      clearTokens();
      session.user = null;
      matchSocket.disconnect();
      stopChatScene(this);
      this.goto('AuthScene');
    }, { fill: 0x52303a, stroke: palette.danger });
  }
}
