import api from '../api/client';
import { GAME_WIDTH, GAME_HEIGHT, palette, session, layoutInfo } from '../game/shared';
import { ListScene } from '../components/TutorialModal';

function modeLabel(mode) {
  return mode === 'RANKED' ? 'Ранговый' : 'Обычный';
}

function resultInfo(match) {
  const myId = session.user?.id;
  if (match.winnerId == null) return { text: 'Ничья', color: '#ffe18c' };
  if (myId != null && Number(match.winnerId) === Number(myId)) return { text: 'Победа', color: '#9cffb5' };
  return { text: 'Поражение', color: '#ffb3b3' };
}

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
    const layout = layoutInfo();
    this.drawBackground('Реплеи');
    this.addBackButton();
    if (error) this.addMessage(error, '#ffb3b3', 120);
    if (!matches.length && !error) {
      this.addMessage('У вас пока нет завершённых матчей с реплеями.', palette.muted, GAME_HEIGHT / 2);
      return;
    }

    const rowH = layout.portrait ? 96 : 72;
    const panelW = layout.portrait ? 640 : 980;
    const maxRows = layout.portrait ? 10 : 12;
    matches.slice(0, maxRows).forEach((match, index) => {
      const y = (layout.portrait ? 150 : 130) + index * (rowH + 10);
      const result = resultInfo(match);
      const date = match.createdAt
        ? new Date(match.createdAt).toLocaleDateString('ru-RU')
        : '';
      const row = this.add.rectangle(GAME_WIDTH / 2, y + rowH / 2 - 8, panelW, rowH, palette.panel, 0.94)
        .setStrokeStyle(1, 0x53627a)
        .setInteractive({ useHandCursor: true });
      this.add.text(layout.portrait ? 60 : 170, y + 6, `Матч #${match.id}`, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: layout.portrait ? '20px' : '18px',
        color: palette.text,
      });
      this.add.text(layout.portrait ? 60 : 170, y + (layout.portrait ? 36 : 34), `${modeLabel(match.matchMode)}${date ? ` • ${date}` : ''}`, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '15px',
        color: palette.muted,
      });
      this.add.text(layout.portrait ? GAME_WIDTH - 60 : 980, y + 10, result.text, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '17px',
        color: result.color,
        fontStyle: 'bold',
      }).setOrigin(1, 0);
      if (layout.portrait) {
        this.add.text(GAME_WIDTH - 60, y + 42, 'Смотреть →', {
          fontFamily: 'Segoe UI, Arial',
          fontSize: '14px',
          color: '#ffe18c',
        }).setOrigin(1, 0);
      } else {
        this.add.text(980, y + 36, 'Смотреть реплей →', {
          fontFamily: 'Segoe UI, Arial',
          fontSize: '14px',
          color: '#ffe18c',
        }).setOrigin(1, 0);
      }
      row.on('pointerdown', () => {
        window.history.pushState({}, '', `/replay/${match.id}`);
        this.scene.start('ReplayViewerScene', { matchId: match.id });
      });
    });
  }
}

export default ReplaysScene;
