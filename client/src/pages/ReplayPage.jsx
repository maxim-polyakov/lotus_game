import api from '../api/client';
import { GAME_WIDTH, GAME_HEIGHT, palette, layoutInfo } from '../game/shared';
import { BaseScene } from '../components/TutorialModal';
import { CardGameObject } from '../components/CardDisplay';
import { asArray } from '../components/ErrorDetail';

export class ReplayViewerScene extends BaseScene {
  constructor() {
    super('ReplayViewerScene');
  }

  create(data = {}) {
    this.matchId = data.matchId || this.matchIdFromPath();
    this.stepIndex = 0;
    this.drawBackground('Реплей');
    this.addBackButton('ReplaysScene');
    this.addMessage('Загрузка реплея...', palette.text, 120);
    Promise.all([
      api.get(`/api/matches/${this.matchId}/replay`).then(({ data: steps }) => steps || []),
      api.get('/api/cards').then(({ data: cards }) => asArray(cards)),
    ]).then(([steps, cards]) => {
      this.steps = steps;
      this.cards = cards;
      const portraitUrls = [];
      steps.forEach((step) => {
        const gs = step?.gameState;
        if (gs?.player1?.portraitUrl) portraitUrls.push(gs.player1.portraitUrl);
        if (gs?.player2?.portraitUrl) portraitUrls.push(gs.player2.portraitUrl);
      });
      return Promise.all([
        this.loadCardTextures(cards),
        this.loadImageUrls(portraitUrls),
      ]);
    }).then(() => this.renderReplay()).catch((err) => this.renderError(err.response?.data?.message || err.message || 'Ошибка реплея'));
  }

  matchIdFromPath() {
    const match = window.location.pathname.match(/^\/replay\/(\d+)/);
    return match ? Number(match[1]) : null;
  }

  getCard(type, id) {
    return this.cards.find((c) => c.cardType === type && c.id === id);
  }

  renderError(message) {
    this.clearScene();
    this.drawBackground('Реплей');
    this.addBackButton('ReplaysScene');
    this.addMessage(message, '#ffb3b3', GAME_HEIGHT / 2);
  }

  renderReplay() {
    this.clearScene();
    const layout = layoutInfo();
    this.drawBackground(`Реплей #${this.matchId}`);
    this.addBackButton('ReplaysScene');
    const step = this.steps[this.stepIndex];
    if (!step?.gameState) {
      this.addMessage('В реплее нет шагов', palette.text, GAME_HEIGHT / 2);
      return;
    }

    this.add.text(GAME_WIDTH / 2, layout.portrait ? 88 : 92, `${this.stepIndex + 1}/${this.steps.length}: ${step.description || step.actionType}`, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: layout.portrait ? '17px' : '20px',
      color: palette.text,
      wordWrap: { width: layout.portrait ? 640 : 900 },
      align: 'center',
    }).setOrigin(0.5);

    const p1 = step.gameState.player1;
    const p2 = step.gameState.player2;

    if (layout.portrait) {
      this.renderReplayHero(p2, GAME_WIDTH / 2, 150);
      this.renderReplayBoard(p2, 280, false);
      this.renderReplayBoard(p1, 520, true);
      this.renderReplayHand(p1, 760);
      this.renderReplayHero(p1, GAME_WIDTH / 2, 980);
      this.addButton(GAME_WIDTH / 2 - 120, 1180, 140, 40, 'Шаг назад', () => {
        this.stepIndex = Math.max(0, this.stepIndex - 1);
        this.renderReplay();
      });
      this.addButton(GAME_WIDTH / 2 + 120, 1180, 140, 40, 'Шаг вперёд', () => {
        this.stepIndex = Math.min(this.steps.length - 1, this.stepIndex + 1);
        this.renderReplay();
      });
    } else {
      this.renderReplayHero(p2, 160, 130);
      this.renderReplayBoard(p2, 200, false);
      this.renderReplayBoard(p1, 400, true);
      this.renderReplayHand(p1, 560);
      this.renderReplayHero(p1, 160, 620);
      this.addButton(500, 680, 140, 40, 'Шаг назад', () => {
        this.stepIndex = Math.max(0, this.stepIndex - 1);
        this.renderReplay();
      });
      this.addButton(780, 680, 140, 40, 'Шаг вперёд', () => {
        this.stepIndex = Math.min(this.steps.length - 1, this.stepIndex + 1);
        this.renderReplay();
      });
    }
  }

  renderReplayHero(player, x, y) {
    if (!player) return;
    const layout = layoutInfo();
    const width = layout.portrait ? 300 : 260;
    this.add.rectangle(x, y, width, 88, palette.panel2, 0.95).setStrokeStyle(2, 0x53627a);
    this.addAvatar(layout.portrait ? x - 100 : x - 90, y, player.portraitUrl, player.heroName || '?', 52);
    const textX = layout.portrait ? x - 60 : x - 50;
    this.add.text(textX, y - 24, player.heroName || 'Герой', {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '17px',
      color: palette.text,
      wordWrap: { width: width - 90 },
    });
    this.add.text(textX, y + 4, `HP ${player.health}${player.maxHeroHealth != null ? ` / ${player.maxHeroHealth}` : ''}  ·  Мана ${player.mana ?? '?'}`, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '14px',
      color: palette.muted,
    });
  }

  renderReplayBoard(player, y, mine) {
    const layout = layoutInfo();
    const board = player?.board || [];
    const gap = layout.portrait ? 92 : 110;
    const cardW = layout.portrait ? 78 : 96;
    const cardH = layout.portrait ? 110 : 132;
    const startX = layout.portrait
      ? GAME_WIDTH / 2 - ((Math.min(board.length, 7) - 1) * gap) / 2
      : 250;
    if (!board.length) {
      this.add.text(layout.portrait ? GAME_WIDTH / 2 : 250, y, mine ? 'Стол пуст' : 'Стол соперника пуст', {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '14px',
        color: palette.muted,
      }).setOrigin(layout.portrait ? 0.5 : 0, 0.5);
      return;
    }
    board.slice(0, 7).forEach((minion, index) => {
      const source = this.getCard('MINION', minion.cardId) || {};
      new CardGameObject(this, startX + index * gap, y, {
        ...source,
        ...minion,
        health: minion.currentHealth,
      }, { width: cardW, height: cardH });
    });
  }

  renderReplayHand(player, y) {
    const layout = layoutInfo();
    const hand = player?.hand || [];
    this.add.text(layout.portrait ? 40 : 80, y - 48, `Рука (${hand.length})`, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '16px',
      color: palette.muted,
    });
    if (!hand.length) {
      this.add.text(layout.portrait ? GAME_WIDTH / 2 : 250, y, 'Пусто', {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '14px',
        color: palette.muted,
      }).setOrigin(layout.portrait ? 0.5 : 0, 0.5);
      return;
    }
    const gap = layout.portrait ? 78 : 88;
    const cardW = layout.portrait ? 66 : 78;
    const cardH = layout.portrait ? 94 : 110;
    const visible = hand.slice(0, layout.portrait ? 8 : 10);
    const startX = layout.portrait
      ? GAME_WIDTH / 2 - ((visible.length - 1) * gap) / 2
      : 220;
    visible.forEach((c, index) => {
      const source = this.getCard(c.cardType, c.cardId) || { cardType: c.cardType, id: c.cardId, name: `#${c.cardId}` };
      new CardGameObject(this, startX + index * gap, y, source, { width: cardW, height: cardH });
    });
  }
}

export default ReplayViewerScene;
