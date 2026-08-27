import api from '../api/client';
import { GAME_WIDTH, GAME_HEIGHT, palette, layoutInfo } from '../game/shared';
import { ListScene } from '../components/TutorialModal';

export class NotificationsScene extends ListScene {
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
    const layout = layoutInfo();
    this.drawBackground('Уведомления');
    this.addBackButton();
    if (message) {
      this.addMessage(message, message.includes('Ошибка') ? '#ffb3b3' : palette.text, layout.portrait ? GAME_HEIGHT - 70 : 655);
    }
    if (!items.length && !message) {
      this.addMessage('Уведомлений пока нет', palette.muted, GAME_HEIGHT / 2);
      return;
    }

    const rowH = layout.portrait ? 92 : 48;
    const panelW = layout.portrait ? 640 : 980;
    const maxRows = layout.portrait ? 11 : 12;
    items.slice(0, maxRows).forEach((n, index) => {
      const y = (layout.portrait ? 145 : 130) + index * (rowH + 8);
      this.add.rectangle(GAME_WIDTH / 2, y + rowH / 2 - 6, panelW, rowH, n.read ? 0x1d2536 : 0x303f60, 0.94)
        .setStrokeStyle(1, n.read ? 0x34445f : palette.primary);
      this.add.text(layout.portrait ? 55 : 170, y + 4, `${n.read ? 'Прочитано' : 'Новое'}  ${n.title || n.type}`, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: layout.portrait ? '16px' : '16px',
        color: '#ffe18c',
        wordWrap: { width: layout.portrait ? 500 : 700 },
      });
      this.add.text(layout.portrait ? 55 : 170, y + (layout.portrait ? 34 : 24), n.message || '', {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '14px',
        color: palette.text,
        wordWrap: { width: layout.portrait ? (n.read ? 580 : 420) : 700 },
      });
      if (!n.read) {
        if (layout.portrait) {
          this.addButton(GAME_WIDTH - 90, y + rowH / 2 - 6, 130, 30, 'Прочитать', async () => {
            await api.post(`/api/notifications/${n.id}/read`);
            this.loadNotifications('Отмечено как прочитанное');
          }, { fontSize: 13 });
        } else {
          this.addButton(1030, y + 18, 130, 28, 'Прочитать', async () => {
            await api.post(`/api/notifications/${n.id}/read`);
            this.loadNotifications('Отмечено как прочитанное');
          }, { fontSize: 14 });
        }
      }
    });
  }
}

export default NotificationsScene;
