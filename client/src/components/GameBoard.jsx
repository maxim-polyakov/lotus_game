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
    this.pollEvent = null;
    this._onVisible = null;
  }

  create() {
    this.events.once('shutdown', () => this.cleanup());
    this.drawBackground('Матч');
    this.addMessage('Загрузка матча...', palette.text, GAME_HEIGHT / 2);
    this.loadData()
      .then(() => {
        this.connectSocket();
        this.startPolling();
        this.bindVisibilityRefresh();
        this.render();
        // Textures in background — never block entering the match on mobile.
        this.prepareAssets()
          .then(() => {
            if (this.sys?.isActive?.() !== false) this.render(this.match);
          })
          .catch(() => {});
      })
      .catch((err) => this.renderError(err.response?.data?.message || err.message || 'Ошибка матча'));
  }

  cleanup() {
    this.unsubscribeMatch?.();
    this.unsubscribeErrors?.();
    this.unsubscribeMatch = null;
    this.unsubscribeErrors = null;
    this.pollEvent?.remove(false);
    this.pollEvent = null;
    if (this._onVisible) {
      document.removeEventListener('visibilitychange', this._onVisible);
      window.removeEventListener('pageshow', this._onVisible);
      this._onVisible = null;
    }
  }

  shutdown() {
    this.cleanup();
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

  applyMatchUpdate(match, previous = this.match) {
    if (!match) return;
    this.match = match;
    if (match.status === 'FINISHED') {
      sessionStorage.removeItem(ACTIVE_MATCH_KEY);
    }
    this.render(previous);
  }

  connectSocket() {
    if (!this.match?.id) return;
    matchSocket.connect()
      .then(() => {
        this.unsubscribeMatch?.();
        this.unsubscribeErrors?.();
        this.unsubscribeMatch = matchSocket.subscribeMatch(this.match.id, (match) => {
          this.applyMatchUpdate(match, this.match);
        });
        this.unsubscribeErrors = matchSocket.subscribeErrors((err) => {
          this.addMessage(err.message, '#ffb3b3');
        });
      })
      .catch(() => {
        // Polling below covers offline / failed WS.
      });
  }

  startPolling() {
    this.pollEvent?.remove(false);
    this.pollEvent = this.time.addEvent({
      delay: 2500,
      loop: true,
      callback: () => this.refreshMatchFromApi(false),
    });
  }

  bindVisibilityRefresh() {
    this._onVisible = () => {
      if (document.visibilityState && document.visibilityState !== 'visible') return;
      this.connectSocket();
      this.refreshMatchFromApi(true);
    };
    document.addEventListener('visibilitychange', this._onVisible);
    window.addEventListener('pageshow', this._onVisible);
  }

  async refreshMatchFromApi(forceRender = false) {
    if (!this.match?.id) return;
    if (this.match.status === 'FINISHED') return;
    try {
      const { data } = await api.get(`/api/matches/${this.match.id}`);
      if (!data) return;
      const prev = this.match;
      const changed = forceRender
        || prev?.status !== data.status
        || prev?.currentTurnPlayerId !== data.currentTurnPlayerId
        || JSON.stringify(prev?.gameState) !== JSON.stringify(data.gameState);
      if (changed) this.applyMatchUpdate(data, prev);
    } catch {
      // ignore transient mobile network blips
    }
  }

  getCard(type, id) {
    return this.cards.find((c) => c.cardType === type && c.id === id);
  }

  /** @returns {'enemy'|'ally'|null} */
  targetSide(card) {
    if (!card) return null;
    const battlecry = String(card.battlecryType || '').toUpperCase();
    const battlecryVal = card.battlecryValue || 0;
    if (battlecry === 'BUFF_ALLY' && battlecryVal > 0) return 'ally';
    if (battlecry === 'HEAL' && battlecryVal > 0) return 'ally';
    if (battlecry === 'DEAL_DAMAGE' && battlecryVal > 0) return 'enemy';
    if (String(card.cardType || '').toUpperCase() === 'SPELL' && (card.damage || 0) > 0) return 'enemy';
    return null;
  }

  needsTarget(card) {
    return !!this.targetSide(card);
  }

  allowsHeroTarget(card) {
    const side = this.targetSide(card);
    if (!side) return false;
    const battlecry = String(card.battlecryType || '').toUpperCase();
    if (battlecry === 'BUFF_ALLY') return false;
    return true;
  }

  targetHint(card) {
    const side = this.targetSide(card);
    if (side === 'ally') return 'Выберите союзную цель';
    if (side === 'enemy') return 'Выберите цель соперника';
    return '';
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
    const pendingCard = this.selectedSpell?.card;
    const turnLabel = this.selectedSpell
      ? this.targetHint(pendingCard)
      : (isMyTurn ? 'Ваш ход' : 'Ход соперника');
    const turnColor = this.selectedSpell ? '#ffe18c' : (isMyTurn ? '#ffe18c' : palette.muted);

    if (layout.portrait) {
      this.renderHero(layout.centerX, 145, enemy, false);
      this.renderBoard(enemy, 300, false, isMyTurn);
      this.add.text(layout.centerX, 470, turnLabel, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '22px',
        color: turnColor,
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
      this.add.text(GAME_WIDTH / 2, 345, turnLabel, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '24px',
        color: turnColor,
      }).setOrigin(0.5);
      if (isMyTurn) {
        this.addButton(layout.centerX + 280, 350, 160, 48, 'Конец хода', () => this.endTurn(), { fill: palette.primaryDark });
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
    const pending = this.selectedSpell?.card;
    const side = this.targetSide(pending);
    const heroOk = this.allowsHeroTarget(pending);
    const canTargetSpell = !!pending && heroOk && (
      (side === 'enemy' && !mine && !(state.board || []).length)
      || (side === 'ally' && mine)
    );
    const canTargetAttack = !mine && !!this.selectedAttacker && !(state.board || []).length;
    const canTarget = canTargetSpell || canTargetAttack;
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
    const pending = this.selectedSpell?.card;
    const side = this.targetSide(pending);
    board.forEach((minion, index) => {
      const source = this.getCard('MINION', minion.cardId) || {};
      const card = { ...source, ...minion, health: minion.currentHealth };
      const canBeSpellTarget = !!pending && (
        (side === 'enemy' && !mine && !minion.stealth)
        || (side === 'ally' && mine)
      );
      const canBeAttackTarget = !mine && !!this.selectedAttacker && !minion.stealth;
      const canBeTarget = canBeSpellTarget || canBeAttackTarget;
      const view = new CardGameObject(this, startX + index * gap, y, card, {
        width: layout.portrait ? 88 : 105,
        height: layout.portrait ? 122 : 145,
        selected: this.selectedAttacker === minion.instanceId || canBeTarget,
      });
      this.cardViews.set(minion.instanceId, view);
      if (canBeTarget) {
        view.on('pointerdown', () => this.useTarget(minion.instanceId));
      } else if (mine && isMyTurn && minion.canAttack && !this.selectedSpell) {
        view.on('pointerdown', () => {
          this.selectedAttacker = this.selectedAttacker === minion.instanceId ? null : minion.instanceId;
          this.selectedSpell = null;
          this.render();
        });
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
          if (this.needsTarget(card)) {
            const side = this.targetSide(card);
            if (side === 'ally' && !(me.board || []).length && !this.allowsHeroTarget(card)) {
              this.addMessage('Нет союзных миньонов для бафа', '#ffb3b3');
              return;
            }
            this.selectedSpell = this.selectedSpell?.instanceId === slot.instanceId
              ? null
              : { ...slot, card };
            this.selectedAttacker = null;
            this.render();
            return;
          }
          view.playCardEffect();
          this.playCard(slot.instanceId, (me.board || []).length, null);
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
      await this.sendMatchAction(
        `/app/matches/${this.match.id}/play`,
        { instanceId, targetPosition, targetInstanceId },
        () => api.post(`/api/matches/${this.match.id}/play`, { instanceId, targetPosition, targetInstanceId }),
      );
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
      await this.sendMatchAction(
        `/app/matches/${this.match.id}/attack`,
        { attackerInstanceId, targetInstanceId },
        () => api.post(`/api/matches/${this.match.id}/attack`, { attackerInstanceId, targetInstanceId }),
      );
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
      const pending = this.selectedSpell;
      const isPlayer1 = this.match?.player1Id === session.user?.id;
      const me = isPlayer1 ? this.match?.gameState?.player1 : this.match?.gameState?.player2;
      this.selectedSpell = null;
      this.playCard(pending.instanceId, (me?.board || []).length, targetInstanceId);
    }
  }

  async endTurn() {
    try {
      await this.sendMatchAction(
        `/app/matches/${this.match.id}/end-turn`,
        {},
        () => api.post(`/api/matches/${this.match.id}/end-turn`),
      );
    } catch (err) {
      this.addMessage(err.response?.data?.message || err.message || 'Ошибка завершения хода', '#ffb3b3');
    }
  }

  async sendMatchAction(wsDestination, wsBody, restCall) {
    if (matchSocket.connected) {
      try {
        matchSocket.publish(wsDestination, wsBody);
        // Mobile WS often drops the topic push — pull state shortly after action.
        this.time.delayedCall(400, () => this.refreshMatchFromApi(true));
        this.time.delayedCall(1200, () => this.refreshMatchFromApi(true));
        return;
      } catch {
        // fall through to REST
      }
    }
    const { data } = await restCall();
    this.applyMatchUpdate(data, this.match);
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
