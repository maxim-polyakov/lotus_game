import api from '../api/client';
import { GAME_WIDTH, GAME_HEIGHT, palette, layoutInfo } from '../game/shared';
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
    const layout = layoutInfo();
    this.drawBackground('Друзья');
    this.addBackButton();

    const formX = layout.portrait ? layout.centerX : 280;
    const formY = layout.portrait ? 145 : 135;
    this.addDomForm(formX, formY, `
      <form class="phaser-form phaser-form-inline ${layout.portrait ? 'phaser-form-inline--portrait' : ''}">
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

    const msgY = layout.portrait ? GAME_HEIGHT - 70 : 655;
    if (message) {
      this.addMessage(message, message.includes('Не') || message.includes('Ошибка') ? '#ffb3b3' : palette.text, msgY);
    }

    const rows = [
      ...(data.friends || []).map((x) => ({ kind: 'Друг', name: x.username, online: x.online, avatarUrl: x.avatarUrl })),
      ...(data.incoming || []).map((x) => ({ kind: 'Входящая заявка', name: x.fromUsername || x.username, id: x.id, incoming: true, avatarUrl: x.avatarUrl })),
      ...(data.outgoing || []).map((x) => ({ kind: 'Исходящая заявка', name: x.toUsername || x.username, avatarUrl: x.avatarUrl })),
    ];

    if (!rows.length) {
      this.addMessage('Список друзей пуст', palette.muted, layout.portrait ? 280 : 260);
      return;
    }

    const rowH = layout.portrait ? 78 : 42;
    const startY = layout.portrait ? 230 : 220;
    const maxRows = layout.portrait ? 12 : 14;
    rows.slice(0, maxRows).forEach((row, index) => {
      const y = startY + index * rowH;
      const panelW = layout.portrait ? 640 : 980;
      this.add.rectangle(GAME_WIDTH / 2, y + (layout.portrait ? 28 : 12), panelW, layout.portrait ? 68 : 36, palette.panel, 0.92)
        .setStrokeStyle(1, 0x53627a);
      this.addAvatar(layout.portrait ? 70 : 96, y + (layout.portrait ? 28 : 10), row.avatarUrl, row.name, layout.portrait ? 36 : 28);
      this.add.text(layout.portrait ? 100 : 130, y + (layout.portrait ? 8 : 0), `${row.kind}: ${row.name}`, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: layout.portrait ? '17px' : '18px',
        color: palette.text,
        wordWrap: { width: layout.portrait ? 360 : 520 },
      });
      if (row.online) {
        this.add.text(layout.portrait ? 100 : 130, y + (layout.portrait ? 36 : 0), 'онлайн', {
          fontFamily: 'Segoe UI, Arial',
          fontSize: '14px',
          color: '#9cffb5',
        });
      }
      if (row.incoming) {
        if (layout.portrait) {
          this.addButton(GAME_WIDTH - 180, y + 28, 110, 28, 'Принять', () => this.friendAction(row.id, 'accept'), { fontSize: 13, fill: 0x28543a, stroke: palette.ok });
          this.addButton(GAME_WIDTH - 60, y + 28, 110, 28, 'Откл.', () => this.friendAction(row.id, 'decline'), { fontSize: 13, fill: 0x52303a, stroke: palette.danger });
        } else {
          this.addButton(760, y + 12, 120, 28, 'Принять', () => this.friendAction(row.id, 'accept'), { fontSize: 14, fill: 0x28543a, stroke: palette.ok });
          this.addButton(900, y + 12, 120, 28, 'Отклонить', () => this.friendAction(row.id, 'decline'), { fontSize: 14, fill: 0x52303a, stroke: palette.danger });
        }
      }
    });
  }

  async friendAction(id, action) {
    await api.post(`/api/friends/requests/${id}/${action}`);
    this.loadFriends('Готово');
  }
}

export default FriendsScene;
