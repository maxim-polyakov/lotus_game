import api from '../api/client';
import { GAME_WIDTH, GAME_HEIGHT, palette, layoutInfo } from '../game/shared';
import { ListScene } from '../components/TutorialModal';
import { asArray } from '../components/ErrorDetail';

export class LeaderboardScene extends ListScene {
  constructor() {
    super('LeaderboardScene', 'Рейтинг', async () => [], () => '');
  }

  create() {
    this.events.once('shutdown', () => this.teardownScroll());
    this._scrollY = 0;
    this.drawBackground('Рейтинг');
    this.addBackButton();
    this.addMessage('Загрузка рейтинга...', palette.text, 120);
    api.get('/api/leaderboard')
      .then(({ data }) => this.loadImageUrls(asArray(data).map((u) => u.avatarUrl)).then(() => this.renderLeaderboard(asArray(data))))
      .catch((err) => this.renderLeaderboard([], err.response?.data?.message || err.message || 'Ошибка загрузки'));
  }

  renderLeaderboard(players, error = '') {
    this.teardownScroll();
    this.clearScene();
    this.cameras?.main?.setScroll(0, 0);

    const layout = layoutInfo();
    const pageH = Math.max(GAME_HEIGHT * 2, 1000 + (players.length || 1) * 80);
    this.add.rectangle(0, 0, GAME_WIDTH, pageH, palette.bg).setOrigin(0).setDepth(0);
    this.drawStickyHeader('Рейтинг');
    const back = this.addBackButton();
    this.pin(back);

    if (error) {
      this.add.text(GAME_WIDTH / 2, 120, error, {
        fontFamily: 'Segoe UI, Arial', fontSize: '18px', color: '#ffb3b3', align: 'center', wordWrap: { width: 900 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(3001);
    }
    if (!players.length && !error) {
      this.addMessage('Рейтинг пока пуст', palette.muted, GAME_HEIGHT / 2);
      return;
    }

    const rowH = layout.portrait ? 72 : 48;
    const panelW = layout.portrait ? 640 : 720;
    const startY = layout.portrait ? 145 : 135;
    let contentBottom = startY;

    players.forEach((u, index) => {
      const y = startY + index * (rowH + 6);
      contentBottom = y + rowH;
      this.add.rectangle(GAME_WIDTH / 2, y + rowH / 2 - 8, panelW, rowH, palette.panel, 0.92)
        .setStrokeStyle(1, 0x53627a);
      const avatarX = layout.portrait ? 70 : 310;
      this.addAvatar(avatarX, y + rowH / 2 - 8, u.avatarUrl, u.username, layout.portrait ? 36 : 32);
      this.add.text(layout.portrait ? 100 : 350, y + (layout.portrait ? 8 : 4), `${index + 1}. ${u.username}`, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '18px',
        color: palette.text,
        wordWrap: { width: layout.portrait ? 360 : 380 },
      });
      this.add.text(layout.portrait ? GAME_WIDTH - 60 : 780, y + (layout.portrait ? 12 : 8), String(u.rating ?? 0), {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '18px',
        color: '#ffe18c',
        fontStyle: 'bold',
      }).setOrigin(1, 0);
    });

    this.setupScroll(contentBottom + 80);
  }
}

export default LeaderboardScene;
