import api from '../api/client';
import { GAME_WIDTH, GAME_HEIGHT, palette, session, layoutInfo } from '../game/shared';
import { ListScene } from '../components/TutorialModal';
import { errorMessage } from '../components/ErrorDetail';

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
    this.events.once('shutdown', () => this.teardownScroll());
    this._scrollY = 0;
    this.drawBackground('Реплеи');
    this.addBackButton();
    this.addMessage('Загрузка матчей...', palette.text, 120);
    api.get('/api/matches')
      .then(({ data }) => this.renderReplays((data || []).filter((m) => m.status === 'FINISHED')))
      .catch((err) => this.renderReplays([], errorMessage(err, 'Ошибка загрузки')));
  }

  renderReplays(matches, error = '') {
    this.teardownScroll();
    this.clearScene();
    this.cameras?.main?.setScroll(0, 0);

    const layout = layoutInfo();
    const pageH = Math.max(GAME_HEIGHT * 2, 2000 + matches.length * 100);
    this.add.rectangle(0, 0, GAME_WIDTH, pageH, palette.bg).setOrigin(0).setDepth(0);

    this.drawStickyHeader('Реплеи');
    const back = this.addBackButton();
    this.pin(back);

    if (error) {
      this.add.text(GAME_WIDTH / 2, 120, error, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '18px',
        color: '#ffb3b3',
        align: 'center',
        wordWrap: { width: 900 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(3001);
    }
    if (!matches.length && !error) {
      this.addMessage('У вас пока нет завершённых матчей с реплеями.', palette.muted, GAME_HEIGHT / 2);
      this.setupScroll(GAME_HEIGHT);
      return;
    }

    const rowH = layout.portrait ? 96 : 72;
    const panelW = layout.portrait ? 640 : 980;
    const startY = layout.portrait ? 150 : 130;
    let contentBottom = startY;

    matches.forEach((match, index) => {
      const y = startY + index * (rowH + 10);
      contentBottom = y + rowH;
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
      this.add.text(layout.portrait ? GAME_WIDTH - 80 : 960, y + 10, result.text, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '17px',
        color: result.color,
        fontStyle: 'bold',
      }).setOrigin(1, 0);
      if (layout.portrait) {
        this.add.text(GAME_WIDTH - 80, y + 42, 'Смотреть →', {
          fontFamily: 'Segoe UI, Arial',
          fontSize: '14px',
          color: '#ffe18c',
        }).setOrigin(1, 0);
      } else {
        this.add.text(960, y + 36, 'Смотреть реплей →', {
          fontFamily: 'Segoe UI, Arial',
          fontSize: '14px',
          color: '#ffe18c',
        }).setOrigin(1, 0);
      }
      row.on('pointerup', () => {
        if (this.wasDragging()) return;
        window.history.pushState({}, '', `/replay/${match.id}`);
        this.scene.start('ReplayViewerScene', { matchId: match.id });
      });
    });

    this.setupScroll(contentBottom + 60);
  }
}

export default ReplaysScene;
