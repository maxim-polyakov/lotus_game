import api from '../api/client';
import { GAME_WIDTH, GAME_HEIGHT, palette, layoutInfo } from '../game/shared';
import { ListScene } from '../components/TutorialModal';
import { asArray } from '../components/ErrorDetail';

export class LeaderboardScene extends ListScene {
  constructor() {
    super('LeaderboardScene', 'Рейтинг', async () => [], () => '');
  }

  create() {
    this.drawBackground('Рейтинг');
    this.addBackButton();
    this.addMessage('Загрузка рейтинга...', palette.text, 120);
    api.get('/api/leaderboard')
      .then(({ data }) => this.loadImageUrls(asArray(data).map((u) => u.avatarUrl)).then(() => this.renderLeaderboard(asArray(data))))
      .catch((err) => this.renderLeaderboard([], err.response?.data?.message || err.message || 'Ошибка загрузки'));
  }

  renderLeaderboard(players, error = '') {
    this.clearScene();
    const layout = layoutInfo();
    this.drawBackground('Рейтинг');
    this.addBackButton();
    if (error) this.addMessage(error, '#ffb3b3', 120);
    if (!players.length && !error) {
      this.addMessage('Рейтинг пока пуст', palette.muted, GAME_HEIGHT / 2);
      return;
    }

    const rowH = layout.portrait ? 72 : 42;
    const panelW = layout.portrait ? 640 : 720;
    const maxRows = layout.portrait ? 14 : 12;
    players.slice(0, maxRows).forEach((u, index) => {
      const y = (layout.portrait ? 145 : 135) + index * (rowH + 6);
      this.add.rectangle(GAME_WIDTH / 2, y + rowH / 2 - 8, panelW, rowH, palette.panel, 0.92)
        .setStrokeStyle(1, 0x53627a);
      const avatarX = layout.portrait ? 70 : 310;
      this.addAvatar(avatarX, y + rowH / 2 - 8, u.avatarUrl, u.username, layout.portrait ? 36 : 32);
      this.add.text(layout.portrait ? 100 : 350, y + (layout.portrait ? 8 : 0), `${index + 1}. ${u.username}`, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: layout.portrait ? '18px' : '18px',
        color: palette.text,
        wordWrap: { width: layout.portrait ? 360 : 380 },
      });
      this.add.text(layout.portrait ? GAME_WIDTH - 60 : 780, y + (layout.portrait ? 12 : 0), String(u.rating ?? 0), {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '18px',
        color: '#ffe18c',
        fontStyle: 'bold',
      }).setOrigin(1, 0);
    });
  }
}

export default LeaderboardScene;
