import api from '../api/client';
import { GAME_WIDTH, GAME_HEIGHT, palette } from '../game/shared';
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
      return this.loadCardTextures(cards);
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
    this.drawBackground(`Реплей #${this.matchId}`);
    this.addBackButton('ReplaysScene');
    const step = this.steps[this.stepIndex];
    if (!step?.gameState) {
      this.addMessage('В реплее нет шагов', palette.text, GAME_HEIGHT / 2);
      return;
    }
    this.add.text(GAME_WIDTH / 2, 92, `${this.stepIndex + 1}/${this.steps.length}: ${step.description || step.actionType}`, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '20px',
      color: palette.text,
      wordWrap: { width: 900 },
      align: 'center',
    }).setOrigin(0.5);
    this.renderReplayPlayer(step.gameState.player1, 180);
    this.renderReplayPlayer(step.gameState.player2, 430);
    this.addButton(500, 660, 140, 40, 'Шаг назад', () => {
      this.stepIndex = Math.max(0, this.stepIndex - 1);
      this.renderReplay();
    });
    this.addButton(780, 660, 140, 40, 'Шаг вперёд', () => {
      this.stepIndex = Math.min(this.steps.length - 1, this.stepIndex + 1);
      this.renderReplay();
    });
  }

  renderReplayPlayer(player, y) {
    this.add.text(80, y - 52, `${player.heroName || 'Герой'}  HP ${player.health}  Mana ${player.mana}`, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '18px',
      color: palette.text,
    });
    (player.board || []).slice(0, 7).forEach((minion, index) => {
      const source = this.getCard('MINION', minion.cardId) || {};
      new CardGameObject(this, 250 + index * 115, y, { ...source, ...minion, health: minion.currentHealth }, { width: 96, height: 132 });
    });
  }
}

export default ReplayViewerScene;
