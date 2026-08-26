import api from '../api/client';
import { palette } from '../game/shared';
import { ListScene } from '../components/TutorialModal';

export class FriendsScene extends ListScene {
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

export default FriendsScene;
