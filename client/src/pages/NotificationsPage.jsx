import api from '../api/client';
import { GAME_WIDTH, GAME_HEIGHT, palette, layoutInfo } from '../game/shared';
import { ListScene } from '../components/TutorialModal';

export class NotificationsScene extends ListScene {
  constructor() {
    super('NotificationsScene', 'Уведомления', async () => [], () => '');
  }

  create() {
    this.events.once('shutdown', () => this.teardownScroll());
    this._scrollY = 0;
    this.loadNotifications();
  }

  loadNotifications(message = '') {
    this.teardownScroll();
    this.clearScene();
    this.cameras?.main?.setScroll(0, 0);
    this.drawBackground('Уведомления');
    this.addBackButton();
    this.addMessage('Загрузка уведомлений...', palette.text, 120);
    api.get('/api/notifications')
      .then(({ data }) => this.renderNotifications(data || [], message))
      .catch((err) => this.renderNotifications([], err.response?.data?.message || err.message || 'Ошибка загрузки'));
  }

  renderNotifications(items, message = '') {
    this.teardownScroll();
    this.clearScene();
    this.cameras?.main?.setScroll(0, 0);

    const layout = layoutInfo();
    const pageH = Math.max(GAME_HEIGHT * 2, 1000 + (items.length || 1) * 100);
    this.add.rectangle(0, 0, GAME_WIDTH, pageH, palette.bg).setOrigin(0).setDepth(0);
    this.drawStickyHeader('Уведомления');
    const back = this.addBackButton();
    this.pin(back);

    if (message) {
      this.add.text(GAME_WIDTH / 2, layout.portrait ? GAME_HEIGHT - 70 : GAME_HEIGHT - 50, message, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '16px',
        color: message.includes('Ошибка') ? '#ffb3b3' : palette.text,
        align: 'center',
        wordWrap: { width: layout.portrait ? 600 : 900 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(3001);
    }
    if (!items.length) {
      if (!message || !message.includes('Ошибка')) {
        this.addMessage('Уведомлений пока нет', palette.muted, GAME_HEIGHT / 2);
      }
      this.setupScroll(GAME_HEIGHT);
      return;
    }

    const rowH = layout.portrait ? 92 : 56;
    const panelW = layout.portrait ? 640 : 980;
    const startY = layout.portrait ? 145 : 130;
    let contentBottom = startY;

    items.forEach((n, index) => {
      const y = startY + index * (rowH + 8);
      contentBottom = y + rowH;
      this.add.rectangle(GAME_WIDTH / 2, y + rowH / 2 - 6, panelW, rowH, n.read ? 0x1d2536 : 0x303f60, 0.94)
        .setStrokeStyle(1, n.read ? 0x34445f : palette.primary);
      this.add.text(layout.portrait ? 55 : 170, y + 4, `${n.read ? 'Прочитано' : 'Новое'}  ${n.title || n.type}`, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '16px',
        color: '#ffe18c',
        wordWrap: { width: layout.portrait ? 500 : 700 },
      });
      this.add.text(layout.portrait ? 55 : 170, y + (layout.portrait ? 34 : 26), n.message || '', {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '14px',
        color: palette.text,
        wordWrap: { width: layout.portrait ? (n.read ? 580 : 400) : 700 },
      });
      if (!n.read) {
        const btnX = layout.portrait ? GAME_WIDTH - 90 : 1030;
        const btnY = layout.portrait ? y + rowH / 2 - 6 : y + 22;
        this.addButton(btnX, btnY, 130, layout.portrait ? 30 : 28, 'Прочитать', async () => {
          if (this.wasDragging()) return;
          await api.post(`/api/notifications/${n.id}/read`);
          this.loadNotifications('Отмечено как прочитанное');
        }, { fontSize: layout.portrait ? 13 : 14 });
      }
    });

    this.setupScroll(contentBottom + 80);
  }
}

export default NotificationsScene;
