import api from '../api/client';
import { GAME_WIDTH, palette } from '../game/shared';
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

export default NotificationsScene;
