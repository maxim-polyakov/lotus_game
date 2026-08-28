import api from '../api/client';
import { GAME_WIDTH, GAME_HEIGHT, palette, layoutInfo } from '../game/shared';
import { ListScene } from '../components/TutorialModal';
import { errorMessage } from '../components/ErrorDetail';

export class FriendsScene extends ListScene {
  constructor() {
    super('FriendsScene', 'Друзья', async () => [], () => '');
  }

  create() {
    this.events.once('shutdown', () => this.teardownScroll());
    this._scrollY = 0;
    this.loadFriends();
  }

  loadFriends(message = '') {
    this.teardownScroll();
    this.clearScene();
    this.cameras?.main?.setScroll(0, 0);
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
      .catch((err) => this.renderFriends({}, errorMessage(err, 'Ошибка загрузки')));
  }

  renderFriends(data = {}, message = '') {
    this.teardownScroll();
    this.clearScene();
    this.cameras?.main?.setScroll(0, 0);

    const layout = layoutInfo();
    const rows = [
      ...(data.friends || []).map((x) => ({ kind: 'Друг', name: x.username, online: x.online, avatarUrl: x.avatarUrl })),
      ...(data.incoming || []).map((x) => ({ kind: 'Входящая заявка', name: x.fromUsername || x.username, id: x.id, incoming: true, avatarUrl: x.avatarUrl })),
      ...(data.outgoing || []).map((x) => ({ kind: 'Исходящая заявка', name: x.toUsername || x.username, avatarUrl: x.avatarUrl })),
    ];

    const pageH = Math.max(GAME_HEIGHT * 2, 1000 + (rows.length || 1) * 90);
    this.add.rectangle(0, 0, GAME_WIDTH, pageH, palette.bg).setOrigin(0).setDepth(0);
    this.drawStickyHeader('Друзья');
    const back = this.addBackButton();
    this.pin(back);

    const formX = layout.portrait ? layout.centerX : 280;
    const formY = layout.portrait ? 145 : 135;
    const formDom = this.addDomForm(formX, formY, `
      <form class="phaser-form phaser-form-inline ${layout.portrait ? 'phaser-form-inline--portrait' : ''}">
        <input name="username" placeholder="Username друга" required />
        <button type="submit">Отправить заявку</button>
      </form>
    `, async (values) => {
      try {
        await api.post('/api/friends/requests', { username: values.username.trim() });
        this.loadFriends('Заявка отправлена');
      } catch (err) {
        this.renderFriends(data, errorMessage(err, 'Не удалось отправить заявку'));
      }
    });
    this.pin(formDom, 3100);

    if (message) {
      this.add.text(GAME_WIDTH / 2, layout.portrait ? GAME_HEIGHT - 70 : GAME_HEIGHT - 50, message, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '16px',
        color: message.includes('Не') || message.includes('Ошибка') ? '#ffb3b3' : palette.text,
        align: 'center',
        wordWrap: { width: layout.portrait ? 600 : 900 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(3001);
    }

    if (!rows.length) {
      this.addMessage('Список друзей пуст', palette.muted, layout.portrait ? 320 : 300);
      this.setupScroll(GAME_HEIGHT);
      return;
    }

    const rowH = layout.portrait ? 78 : 56;
    const panelH = layout.portrait ? 68 : 48;
    const panelW = layout.portrait ? 640 : 980;
    const panelLeft = (GAME_WIDTH - panelW) / 2;
    const startY = layout.portrait ? 240 : 220;
    let contentBottom = startY;

    rows.forEach((row, index) => {
      const cy = startY + index * rowH + panelH / 2;
      contentBottom = cy + panelH / 2 + 8;
      this.add.rectangle(GAME_WIDTH / 2, cy, panelW, panelH, palette.panel, 0.92)
        .setStrokeStyle(1, 0x53627a);

      const avatarSize = layout.portrait ? 36 : 32;
      const avatarX = panelLeft + 20 + avatarSize / 2;
      this.addAvatar(avatarX, cy, row.avatarUrl, row.name, avatarSize);

      const textX = avatarX + avatarSize / 2 + 14;
      if (row.online) {
        this.add.text(textX, cy - 12, `${row.kind}: ${row.name}`, {
          fontFamily: 'Segoe UI, Arial',
          fontSize: layout.portrait ? '17px' : '18px',
          color: palette.text,
          wordWrap: { width: layout.portrait ? 260 : 460 },
        });
        this.add.text(textX, cy + 10, 'онлайн', {
          fontFamily: 'Segoe UI, Arial',
          fontSize: '14px',
          color: '#9cffb5',
        });
      } else {
        this.add.text(textX, cy, `${row.kind}: ${row.name}`, {
          fontFamily: 'Segoe UI, Arial',
          fontSize: layout.portrait ? '17px' : '18px',
          color: palette.text,
          wordWrap: { width: layout.portrait ? 260 : 460 },
        }).setOrigin(0, 0.5);
      }

      if (row.incoming) {
        if (layout.portrait) {
          this.addButton(panelLeft + panelW - 140, cy, 110, 28, 'Принять', () => {
            if (this.wasDragging()) return;
            this.friendAction(row.id, 'accept');
          }, { fontSize: 13, fill: 0x28543a, stroke: palette.ok });
          this.addButton(panelLeft + panelW - 22, cy, 100, 28, 'Откл.', () => {
            if (this.wasDragging()) return;
            this.friendAction(row.id, 'decline');
          }, { fontSize: 13, fill: 0x52303a, stroke: palette.danger });
        } else {
          this.addButton(panelLeft + panelW - 280, cy, 120, 30, 'Принять', () => {
            if (this.wasDragging()) return;
            this.friendAction(row.id, 'accept');
          }, { fontSize: 14, fill: 0x28543a, stroke: palette.ok });
          this.addButton(panelLeft + panelW - 140, cy, 120, 30, 'Отклонить', () => {
            if (this.wasDragging()) return;
            this.friendAction(row.id, 'decline');
          }, { fontSize: 14, fill: 0x52303a, stroke: palette.danger });
        }
      }
    });

    this.setupScroll(contentBottom + 80);
  }

  async friendAction(id, action) {
    await api.post(`/api/friends/requests/${id}/${action}`);
    this.loadFriends('Готово');
  }
}

export default FriendsScene;
