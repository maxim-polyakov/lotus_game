import api from '../api/client';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  ACTIVE_MATCH_KEY,
  palette,
  session,
  layoutInfo,
} from '../game/shared';
import { BaseScene } from './TutorialModal';
import { CardGameObject, playCardSound } from './CardDisplay';
import { matchSocket } from './WaitingMatch';

export class MatchScene extends BaseScene {
  constructor() {
    super('MatchScene');
  }

  init(data = {}) {
    this.match = data.match || null;
    this.cards = data.cards || [];
    this.cardViews = new Map();
    this.selectedAttacker = null;
    this.selectedSpell = null;
    this.unsubscribeMatch = null;
    this.unsubscribeErrors = null;
  }

  create() {
    this.loadData().then(() => this.prepareAssets()).then(() => {
      this.connectSocket();
      this.render();
    }).catch((err) => this.renderError(err.response?.data?.message || err.message || 'Ошибка матча'));
  }

  shutdown() {
    this.unsubscribeMatch?.();
    this.unsubscribeErrors?.();
  }

  async loadData() {
    if (!this.match) {
      const id = sessionStorage.getItem(ACTIVE_MATCH_KEY);
      if (id) {
        const { data } = await api.get(`/api/matches/${id}`);
        this.match = data;
      }
    }
    if (!this.cards.length) {
      const { data } = await api.get('/api/cards');
      this.cards = data || [];
    }
  }

  prepareAssets() {
    return this.loadCardTextures(this.cards);
  }

  connectSocket() {
    if (!this.match?.id) return;
    matchSocket.connect().then(() => {
      this.unsubscribeMatch = matchSocket.subscribeMatch(this.match.id, (match) => {
        const previous = this.match;
        this.match = match;
        this.render(previous);
      });
      this.unsubscribeErrors = matchSocket.subscribeErrors((err) => this.addMessage(err.message, '#ffb3b3'));
    }).catch(() => {
      this.time.addEvent({
        delay: 5000,
        loop: true,
        callback: async () => {
          if (this.match?.status !== 'IN_PROGRESS') return;
          const { data } = await api.get(`/api/matches/${this.match.id}`);
          this.match = data;
          this.render();
        },
      });
    });
  }

  getCard(type, id) {
    return this.cards.find((c) => c.cardType === type && c.id === id);
  }

  renderError(message) {
    this.clearScene();
    this.drawBackground('Матч');
    this.addBackButton('PlayScene');
    this.addMessage(message, '#ffb3b3', GAME_HEIGHT / 2);
  }

  render(previous) {
    this.clearScene();
    this.cardViews.clear();
    const layout = layoutInfo();
    this.drawBackground(`Матч #${this.match?.id || ''}`);
    this.addButton(
      layout.portrait ? 90 : 80,
      layout.portrait ? GAME_HEIGHT - 110 : 675,
      120,
      40,
      'Выход',
      () => this.scene.start('PlayScene'),
      { fontSize: 16 },
    );
    if (!this.match?.gameState) {
      this.addMessage('Ожидание начала...', palette.text, GAME_HEIGHT / 2);
      return;
    }

    const isPlayer1 = this.match.player1Id === session.user?.id;
    const me = isPlayer1 ? this.match.gameState.player1 : this.match.gameState.player2;
    const enemy = isPlayer1 ? this.match.gameState.player2 : this.match.gameState.player1;
    const isMyTurn = this.match.currentTurnPlayerId === session.user?.id;

    if (layout.portrait) {
      this.renderHero(layout.centerX, 145, enemy, false);
      this.renderBoard(enemy, 300, false, isMyTurn);
      this.add.text(layout.centerX, 470, isMyTurn ? 'Ваш ход' : 'Ход соперника', {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '22px',
        color: isMyTurn ? '#ffe18c' : palette.muted,
      }).setOrigin(0.5);
      if (isMyTurn) {
        this.addButton(layout.centerX, 525, 220, 48, 'Конец хода', () => this.endTurn(), { fill: palette.primaryDark });
      }
      this.renderBoard(me, 680, true, isMyTurn);
      this.renderHero(layout.centerX, 880, me, true);
      this.renderHand(me, isMyTurn);
    } else {
      this.renderHero(160, 138, enemy, false);
      this.renderHero(160, 575, me, true);
      this.renderBoard(enemy, 180, false, isMyTurn);
      this.renderBoard(me, 430, true, isMyTurn);
      this.renderHand(me, isMyTurn);
      this.add.text(GAME_WIDTH / 2, 345, isMyTurn ? 'Ваш ход' : 'Ход соперника', {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '24px',
        color: isMyTurn ? '#ffe18c' : palette.muted,
      }).setOrigin(0.5);
      if (isMyTurn) {
        this.addButton(GAME_WIDTH - 140, 350, 160, 48, 'Конец хода', () => this.endTurn(), { fill: palette.primaryDark });
      }
    }

    if (this.match.status === 'FINISHED') {
      const result = this.match.winnerId === session.user?.id ? 'Победа!' : this.match.winnerId ? 'Поражение' : 'Ничья';
      this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, layout.portrait ? 520 : 500, 180, 0x000000, 0.78);
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, result, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: layout.portrait ? '40px' : '46px',
        color: this.match.winnerId === session.user?.id ? '#99ffb0' : '#ffb3b3',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      sessionStorage.removeItem(ACTIVE_MATCH_KEY);
    }

    this.animateDiff(previous);
  }

  renderHero(x, y, state, mine) {
    const layout = layoutInfo();
    const canTarget = !mine && (this.selectedAttacker || this.selectedSpell) && !(state.board || []).length;
    const hero = this.add.container(x, y);
    const width = layout.portrait ? 280 : 230;
    const rect = this.add.rectangle(0, 0, width, 76, canTarget ? 0x513a22 : palette.panel2, 0.95)
      .setStrokeStyle(2, canTarget ? palette.primary : 0x53627a);
    const label = this.add.text(layout.portrait ? 0 : -92, -22, state.heroName || (mine ? 'Я' : 'Соперник'), {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '18px',
      color: palette.text,
      align: layout.portrait ? 'center' : 'left',
      wordWrap: { width: width - 24 },
    }).setOrigin(layout.portrait ? 0.5 : 0, 0);
    const hp = this.add.text(layout.portrait ? 0 : -92, 10, `HP ${state.health}${state.maxHeroHealth ? `/${state.maxHeroHealth}` : ''}  Mana ${state.mana ?? '-'}`, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '15px',
      color: palette.muted,
      align: layout.portrait ? 'center' : 'left',
    }).setOrigin(layout.portrait ? 0.5 : 0, 0);
    hero.add([rect, label, hp]);
    if (canTarget) {
      rect.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.useTarget('hero'));
    }
  }

  renderBoard(state, y, mine, isMyTurn) {
    const layout = layoutInfo();
    const board = state.board || [];
    const gap = layout.portrait ? 100 : 118;
    const totalW = Math.max(0, (board.length - 1) * gap);
    const startX = layout.portrait
      ? layout.centerX - totalW / 2
      : 430;
    board.forEach((minion, index) => {
      const source = this.getCard('MINION', minion.cardId) || {};
      const card = { ...source, ...minion, health: minion.currentHealth };
      const view = new CardGameObject(this, startX + index * gap, y, card, {
        width: layout.portrait ? 88 : 105,
        height: layout.portrait ? 122 : 145,
        selected: this.selectedAttacker === minion.instanceId,
      });
      this.cardViews.set(minion.instanceId, view);
      if (mine && isMyTurn && minion.canAttack) {
        view.on('pointerdown', () => {
          this.selectedAttacker = this.selectedAttacker === minion.instanceId ? null : minion.instanceId;
          this.selectedSpell = null;
          this.render();
        });
      }
      if (!mine && (this.selectedAttacker || this.selectedSpell) && !minion.stealth) {
        view.on('pointerdown', () => this.useTarget(minion.instanceId));
      }
    });
  }

  renderHand(me, isMyTurn) {
    const layout = layoutInfo();
    const hand = me.hand || [];
    const gap = layout.portrait ? 92 : 95;
    const cardW = layout.portrait ? 78 : 86;
    const cardH = layout.portrait ? 112 : 122;
    const totalW = Math.max(0, (hand.length - 1) * gap);
    const startX = layout.portrait
      ? Math.max(cardW / 2 + 8, layout.centerX - totalW / 2)
      : 390;
    const y = layout.portrait ? GAME_HEIGHT - 220 : 612;

    hand.forEach((slot, index) => {
      const card = this.getCard(slot.cardType, slot.cardId);
      if (!card) return;
      const x = startX + index * gap;
      const view = new CardGameObject(this, x, y, card, {
        width: cardW,
        height: cardH,
        selected: this.selectedSpell?.instanceId === slot.instanceId,
      });
      this.cardViews.set(slot.instanceId, view);
      const hasMana = me.mana >= (card.manaCost ?? 0);
      const boardFull = (me.board || []).length >= 7;
      const canPlay = isMyTurn && hasMana && (slot.cardType === 'SPELL' || !boardFull);
      view.setAlpha(canPlay ? 1 : 0.48);
      if (canPlay) {
        view.on('pointerdown', () => {
          if (slot.cardType === 'SPELL' && (card.damage || 0) > 0) {
            this.selectedSpell = this.selectedSpell?.instanceId === slot.instanceId ? null : { ...slot, card };
            this.selectedAttacker = null;
            this.render();
          } else {
            view.playCardEffect();
            this.playCard(slot.instanceId, (me.board || []).length, null);
          }
        });
      }
    });
  }

  async playCard(instanceId, targetPosition, targetInstanceId) {
    try {
      this.cardViews.get(instanceId)?.playCardEffect();
      if (!this.cardViews.has(instanceId)) {
        playCardSound(this.findHandCard(instanceId));
      }
      if (matchSocket.client?.connected) {
        matchSocket.publish(`/app/matches/${this.match.id}/play`, { instanceId, targetPosition, targetInstanceId });
      } else {
        const { data } = await api.post(`/api/matches/${this.match.id}/play`, { instanceId, targetPosition, targetInstanceId });
        this.match = data;
        this.render();
      }
    } catch (err) {
      this.addMessage(err.response?.data?.message || err.message || 'Ошибка розыгрыша', '#ffb3b3');
    }
  }

  findHandCard(instanceId) {
    const isPlayer1 = this.match?.player1Id === session.user?.id;
    const me = isPlayer1 ? this.match?.gameState?.player1 : this.match?.gameState?.player2;
    const slot = (me?.hand || []).find((item) => item.instanceId === instanceId);
    if (!slot) return null;
    return this.getCard(slot.cardType, slot.cardId) || slot;
  }

  async attack(attackerInstanceId, targetInstanceId) {
    try {
      const attackerView = this.cardViews.get(attackerInstanceId);
      attackerView?.playCardEffect('attack');
      if (targetInstanceId !== 'hero') this.cardViews.get(targetInstanceId)?.playHitEffect();
      if (matchSocket.client?.connected) {
        matchSocket.publish(`/app/matches/${this.match.id}/attack`, { attackerInstanceId, targetInstanceId });
      } else {
        const { data } = await api.post(`/api/matches/${this.match.id}/attack`, { attackerInstanceId, targetInstanceId });
        this.match = data;
        this.render();
      }
    } catch (err) {
      this.addMessage(err.response?.data?.message || err.message || 'Ошибка атаки', '#ffb3b3');
    }
  }

  useTarget(targetInstanceId) {
    if (this.selectedAttacker) {
      const attacker = this.selectedAttacker;
      this.selectedAttacker = null;
      this.attack(attacker, targetInstanceId);
      return;
    }
    if (this.selectedSpell) {
      const spell = this.selectedSpell;
      this.selectedSpell = null;
      this.playCard(spell.instanceId, null, targetInstanceId);
    }
  }

  async endTurn() {
    try {
      if (matchSocket.client?.connected) {
        matchSocket.publish(`/app/matches/${this.match.id}/end-turn`);
      } else {
        const { data } = await api.post(`/api/matches/${this.match.id}/end-turn`);
        this.match = data;
        this.render();
      }
    } catch (err) {
      this.addMessage(err.response?.data?.message || err.message || 'Ошибка завершения хода', '#ffb3b3');
    }
  }

  animateDiff(previous) {
    if (!previous?.gameState || !this.match?.gameState) return;
    const prevBoards = [
      ...(previous.gameState.player1?.board || []),
      ...(previous.gameState.player2?.board || []),
    ];
    const nextBoards = [
      ...(this.match.gameState.player1?.board || []),
      ...(this.match.gameState.player2?.board || []),
    ];
    nextBoards.forEach((next) => {
      const prev = prevBoards.find((x) => x.instanceId === next.instanceId);
      const view = this.cardViews.get(next.instanceId);
      if (!view) return;
      if (!prev) view.playCardEffect();
      else if (prev.currentHealth !== next.currentHealth) view.playHitEffect();
    });
  }
}

export default MatchScene;
