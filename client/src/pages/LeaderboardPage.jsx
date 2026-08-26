import api from '../api/client';
import { GAME_WIDTH, palette } from '../game/shared';
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
    this.drawBackground('Рейтинг');
    this.addBackButton();
    if (error) this.addMessage(error, '#ffb3b3', 120);
    players.slice(0, 12).forEach((u, index) => {
      const y = 135 + index * 42;
      this.add.rectangle(GAME_WIDTH / 2, y + 10, 720, 36, palette.panel, 0.92).setStrokeStyle(1, 0x53627a);
      this.addAvatar(310, y + 10, u.avatarUrl, u.username, 32);
      this.add.text(350, y, `${index + 1}. ${u.username}`, { fontFamily: 'Segoe UI, Arial', fontSize: '18px', color: palette.text });
      this.add.text(780, y, String(u.rating), { fontFamily: 'Segoe UI, Arial', fontSize: '18px', color: '#ffe18c' });
    });
  }
}

export default LeaderboardScene;
