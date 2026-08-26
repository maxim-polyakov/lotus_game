import api from '../api/client';
import { GAME_WIDTH, palette } from '../game/shared';
import { ListScene } from '../components/TutorialModal';

export class ReplaysScene extends ListScene {
  constructor() {
    super('ReplaysScene', 'Реплеи', async () => [], () => '');
  }

  create() {
    this.drawBackground('Реплеи');
    this.addBackButton();
    this.addMessage('Загрузка матчей...', palette.text, 120);
    api.get('/api/matches')
      .then(({ data }) => this.renderReplays((data || []).filter((m) => m.status === 'FINISHED')))
      .catch((err) => this.renderReplays([], err.response?.data?.message || err.message || 'Ошибка загрузки'));
  }

  renderReplays(matches, error = '') {
    this.clearScene();
    this.drawBackground('Реплеи');
    this.addBackButton();
    if (error) this.addMessage(error, '#ffb3b3', 120);
    matches.slice(0, 12).forEach((match, index) => {
      const y = 130 + index * 42;
      const row = this.add.rectangle(GAME_WIDTH / 2, y + 12, 900, 34, palette.panel, 0.94)
        .setStrokeStyle(1, 0x53627a)
        .setInteractive({ useHandCursor: true });
      this.add.text(210, y, `Матч #${match.id} — ${match.matchMode}, победитель: ${match.winnerId || 'ничья'}`, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '17px',
        color: palette.text,
      });
      row.on('pointerdown', () => {
        window.history.pushState({}, '', `/replay/${match.id}`);
        this.scene.start('ReplayViewerScene', { matchId: match.id });
      });
    });
  }
}

export default ReplaysScene;
