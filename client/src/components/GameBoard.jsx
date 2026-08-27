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
import { formatPostMatchReward } from './PostMatchReward';

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
    this.pollInterval = null;
    this._pollInFlight = false;
    this._onVisible = null;
    this.postMatchReward = null;
    this._rewardFetchedForMatchId = null;
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
    if (this.pollInterval) {
      window.clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.pollEvent?.remove(false);
    this.pollEvent = null;
    this._pollInFlight = false;
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
    const wasFinished = previous?.status === 'FINISHED';
    this.match = match;
    if (match.status === 'FINISHED') {
      sessionStorage.removeItem(ACTIVE_MATCH_KEY);
      if (!wasFinished) this.fetchPostMatchReward(match.id);
    }
    this.queueRender(previous);
  }

  matchFingerprint(match) {
    if (!match) return '';
    const gs = match.gameState;
    const pack = (player) => {
      if (!player) return '';
      const board = (player.board || [])
        .map((m) => `${m.instanceId}:${m.attack}:${m.currentHealth}:${m.canAttack ? 1 : 0}`)
        .join(',');
      const hand = (player.hand || []).map((c) => c.instanceId).join(',');
      return `${player.health}:${player.mana}:${board}|${hand}`;
    };
    return [
      match.status,
      match.currentTurnPlayerId,
      match.winnerId,
      pack(gs?.player1),
      pack(gs?.player2),
    ].join('#');
  }

  queueRender(previous) {
    this._pendingPrevious = previous ?? this._pendingPrevious ?? null;
    if (this._renderQueued) return;
    this._renderQueued = true;
    const run = () => {
      // Don't rebuild the board under an active finger — clicks feel "missed".
      if (this.input?.activePointer?.isDown || this.input?.pointer1?.isDown) {
        requestAnimationFrame(run);
        return;
      }
      this._renderQueued = false;
      if (!this.sys?.isActive?.()) return;
      const prev = this._pendingPrevious;
      this._pendingPrevious = null;
      this.render(prev);
    };
    requestAnimationFrame(run);
  }

  clearMatchScene() {
    [...(this.children?.list || [])].forEach((child) => {
      if (child?.type === 'DOMElement') {
        try {
          child.setVisible(false);
          child.destroy(true);
        } catch {
          // ignore
        }
      }
    });
    // Avoid input.removeAllListeners() — it makes the next taps flaky on mobile.
    this.children.removeAll(true);
  }

  myUserId() {
    return session.user?.id != null ? Number(session.user.id) : null;
  }

  isMe(id) {
    const mine = this.myUserId();
    return mine != null && id != null && Number(id) === mine;
  }

  /** Suppress touch+mouse double-fires that toggle selection off in the same tap. */
  consumeCardGesture(pointer) {
    const now = performance.now();
    const pointerId = pointer?.id ?? -1;
    if (pointerId === this._lastGesturePointerId && now - (this._lastGestureAt || 0) < 300) {
      return false;
    }
    if (now - (this._lastGestureAt || 0) < 45) return false;
    this._lastGesturePointerId = pointerId;
    this._lastGestureAt = now;
    return true;
  }

  canAcceptTargetNow() {
    return performance.now() >= (this._blockTargetsUntil || 0);
  }

  updateSelectionVisuals() {
    const isPlayer1 = this.isMe(this.match?.player1Id);
    const me = isPlayer1 ? this.match?.gameState?.player1 : this.match?.gameState?.player2;
    const enemy = isPlayer1 ? this.match?.gameState?.player2 : this.match?.gameState?.player1;
    const isMyTurn = this.isMe(this.match?.currentTurnPlayerId);
    const pending = this.selectedSpell?.card;
    const side = this.targetSide(pending);
    const targeting = !!(this.selectedSpell || this.selectedAttacker);

    (me?.board || []).forEach((minion) => {
      const view = this.cardViews.get(minion.instanceId);
      if (!view) return;
      const canBeTarget = side === 'ally' && !!pending;
      view.setSelected(this.selectedAttacker === minion.instanceId || canBeTarget);
      view.setDepth(canBeTarget ? 45 : 12);
      view.setInputEnabled(true);
    });
    (enemy?.board || []).forEach((minion) => {
      const view = this.cardViews.get(minion.instanceId);
      if (!view) return;
      const canBeSpellTarget = !!pending && side === 'enemy' && !minion.stealth;
      const canBeAttackTarget = !!this.selectedAttacker && !minion.stealth;
      const canBeTarget = canBeSpellTarget || canBeAttackTarget;
      view.setSelected(canBeTarget);
      view.setDepth(canBeTarget ? 45 : 8);
      view.setInputEnabled(true);
    });
    (me?.hand || []).forEach((slot) => {
      const view = this.cardViews.get(slot.instanceId);
      if (!view) return;
      const isSelectedSpell = this.selectedSpell?.instanceId === slot.instanceId;
      view.setSelected(isSelectedSpell);
      view.setDepth(isSelectedSpell ? 50 : 20);
      // While choosing a buff/attack target, only the selected hand card stays clickable (to cancel).
      view.setInputEnabled(!targeting || isSelectedSpell);
    });

    if (this.turnLabel) {
      const turnText = this.selectedSpell
        ? this.targetHint(pending)
        : (isMyTurn ? 'Ваш ход' : 'Ход соперника');
      this.turnLabel.setText(turnText);
      this.turnLabel.setColor(this.selectedSpell || isMyTurn ? '#ffe18c' : palette.muted);
    }

    (this.heroViews || []).forEach((heroView) => {
      if (!heroView?.rect) return;
      const { mine, state } = heroView;
      const heroOk = this.allowsHeroTarget(pending);
      const canTargetSpell = !!pending && heroOk && (
        (side === 'enemy' && !mine && !(state.board || []).length)
        || (side === 'ally' && mine)
      );
      const canTargetAttack = !mine && !!this.selectedAttacker && !(state.board || []).length;
      const canTarget = canTargetSpell || canTargetAttack;
      heroView.rect.setFillStyle(canTarget ? 0x513a22 : palette.panel2, 0.95);
      heroView.rect.setStrokeStyle(2, canTarget ? palette.primary : 0x53627a);
      if (heroView.rect.input) heroView.rect.input.enabled = true;
    });
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
    if (this.pollInterval) {
      window.clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.pollEvent?.remove(false);
    this.pollEvent = null;
    this._pollInFlight = false;
    this.pollInterval = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      this.refreshMatchFromApi(false);
    }, 2500);
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
    if (this._pollInFlight) return;
    this._pollInFlight = true;
    try {
      const { data } = await api.get(`/api/matches/${this.match.id}`, {
        params: { _: Date.now() },
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!data) return;
      const prev = this.match;
      const changed = forceRender
        || this.matchFingerprint(prev) !== this.matchFingerprint(data);
      if (changed) this.applyMatchUpdate(data, prev);
    } catch {
      // ignore transient mobile network blips
    } finally {
      this._pollInFlight = false;
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
    const side = this.targetSide(card);
    if (!side) return false;
    // Баф без союзников на столе — выставляем миньона сразу, клич не срабатывает.
    if (String(card.battlecryType || '').toUpperCase() === 'BUFF_ALLY') {
      const board = this.myBoard();
      if (!board.length) return false;
    }
    return true;
  }

  myBoard() {
    if (!this.match?.gameState) return [];
    const me = this.isMe(this.match.player1Id)
      ? this.match.gameState.player1
      : this.match.gameState.player2;
    return me?.board || [];
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
    this.addButton(100, GAME_HEIGHT - 90, 120, 40, 'Выход', () => this.leaveMatch(), { fontSize: 16 });
    this.addMessage(message, '#ffb3b3', GAME_HEIGHT / 2);
  }

  render(previous) {
    this.clearMatchScene();
    this.cardViews.clear();
    this.heroViews = [];
    this.turnLabel = null;
    const layout = layoutInfo();
    this.drawBackground(`Матч #${this.match?.id || ''}`);
    this.addButton(
      layout.portrait ? 90 : 80,
      layout.portrait ? GAME_HEIGHT - 110 : 675,
      120,
      40,
      'Выход',
      () => this.leaveMatch(),
      { fontSize: 16 },
    );
    if (!this.match?.gameState) {
      this.addMessage('Ожидание начала...', palette.text, GAME_HEIGHT / 2);
      return;
    }

    const isPlayer1 = this.isMe(this.match.player1Id);
    const me = isPlayer1 ? this.match.gameState.player1 : this.match.gameState.player2;
    const enemy = isPlayer1 ? this.match.gameState.player2 : this.match.gameState.player1;
    const isMyTurn = this.isMe(this.match.currentTurnPlayerId);
    const pendingCard = this.selectedSpell?.card;
    const turnLabel = this.selectedSpell
      ? this.targetHint(pendingCard)
      : (isMyTurn ? 'Ваш ход' : 'Ход соперника');
    const turnColor = this.selectedSpell ? '#ffe18c' : (isMyTurn ? '#ffe18c' : palette.muted);

    if (layout.portrait) {
      this.renderHero(layout.centerX, 145, enemy, false);
      this.renderBoard(enemy, 300, false, isMyTurn);
      this.turnLabel = this.add.text(layout.centerX, 470, turnLabel, {
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
      this.turnLabel = this.add.text(GAME_WIDTH / 2, 345, turnLabel, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '24px',
        color: turnColor,
      }).setOrigin(0.5);
      if (isMyTurn) {
        this.addButton(layout.centerX + 280, 350, 160, 48, 'Конец хода', () => this.endTurn(), { fill: palette.primaryDark });
      }
    }

    if (this.match.status === 'FINISHED') {
      if (!this._rewardFetchedForMatchId) this.fetchPostMatchReward(this.match.id);
      const won = this.isMe(this.match.winnerId);
      const result = won ? 'Победа!' : this.match.winnerId ? 'Поражение' : 'Ничья';
      const reward = this.postMatchReward;
      const rewardLine = formatPostMatchReward(reward);
      const panelH = rewardLine ? 260 : 180;
      this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, layout.portrait ? 540 : 520, panelH, 0x000000, 0.78);
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - (rewardLine ? 70 : 24), result, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: layout.portrait ? '40px' : '46px',
        color: won ? '#99ffb0' : '#ffb3b3',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      if (rewardLine) {
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 8, reward?.title || 'Награда за матч', {
          fontFamily: 'Segoe UI, Arial',
          fontSize: '22px',
          color: '#ffe18c',
        }).setOrigin(0.5);
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 28, rewardLine, {
          fontFamily: 'Segoe UI, Arial',
          fontSize: '20px',
          color: palette.text,
          align: 'center',
          wordWrap: { width: layout.portrait ? 480 : 460 },
        }).setOrigin(0.5);
      }
      this.addButton(GAME_WIDTH / 2, GAME_HEIGHT / 2 + (rewardLine ? 88 : 48), 200, 44, 'В меню', () => this.leaveMatch(), {
        fill: palette.primaryDark,
        fontSize: 18,
      });
      sessionStorage.removeItem(ACTIVE_MATCH_KEY);
    }

    this.animateDiff(previous);
    if (this.selectedSpell || this.selectedAttacker) {
      this.updateSelectionVisuals();
    }
  }

  leaveMatch() {
    this.cleanup();
    sessionStorage.removeItem(ACTIVE_MATCH_KEY);
    this.scene.start('PlayScene');
  }

  async fetchPostMatchReward(matchId) {
    if (!matchId || this._rewardFetchedForMatchId === matchId) return;
    this._rewardFetchedForMatchId = matchId;
    for (let i = 0; i < 8; i += 1) {
      if (!this.sys?.isActive?.()) return;
      try {
        const { data, status } = await api.get('/api/notifications/post-match/latest', {
          params: { matchId },
          validateStatus: (s) => (s >= 200 && s < 300) || s === 204,
        });
        if (status === 200 && data?.id) {
          this.postMatchReward = data;
          try {
            await api.post(`/api/notifications/${data.id}/read`);
          } catch {
            // ignore
          }
          try {
            const { data: me } = await api.get('/api/me');
            if (me && session.user) {
              session.user = { ...session.user, gold: me.gold, dust: me.dust };
            }
          } catch {
            // ignore
          }
          this.queueRender(this.match);
          return;
        }
      } catch {
        // retry — reward may lag a tick behind FINISHED
      }
      await new Promise((resolve) => setTimeout(resolve, 450));
    }
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
    const rect = this.add.rectangle(0, 0, width, 92, canTarget ? 0x513a22 : palette.panel2, 0.95)
      .setStrokeStyle(2, canTarget ? palette.primary : 0x53627a);
    const label = this.add.text(layout.portrait ? 0 : -92, -22, state.heroName || (mine ? 'Я' : 'Соперник'), {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '18px',
      color: palette.text,
      align: layout.portrait ? 'center' : 'left',
      wordWrap: { width: width - 24 },
    }).setOrigin(layout.portrait ? 0.5 : 0, 0);
    const hpLine = `HP ${state.health}${state.maxHeroHealth ? `/${state.maxHeroHealth}` : ''}  Mana ${state.mana ?? '-'}`;
    const deckSize = state.deck?.length ?? 0;
    const fatigue = state.fatigueCounter || 0;
    const deckLine = fatigue > 0
      ? `Колода ${deckSize}  Усталость ${fatigue}`
      : `Колода ${deckSize}`;
    const hp = this.add.text(layout.portrait ? 0 : -92, 6, hpLine, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '15px',
      color: palette.muted,
      align: layout.portrait ? 'center' : 'left',
    }).setOrigin(layout.portrait ? 0.5 : 0, 0);
    const deck = this.add.text(layout.portrait ? 0 : -92, 26, deckLine, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '13px',
      color: fatigue > 0 ? '#ffb3b3' : palette.muted,
      align: layout.portrait ? 'center' : 'left',
    }).setOrigin(layout.portrait ? 0.5 : 0, 0);
    hero.add([rect, label, hp, deck]);
    this.heroViews.push({ rect, mine, state });
    rect.setInteractive({ useHandCursor: true }).on('pointerup', (pointer) => {
      if (!this.canAcceptTargetNow()) return;
      if (!this.consumeCardGesture(pointer)) return;
      const p = this.selectedSpell?.card;
      const s = this.targetSide(p);
      const ok = this.allowsHeroTarget(p);
      const spellOk = !!p && ok && (
        (s === 'enemy' && !mine && !(state.board || []).length)
        || (s === 'ally' && mine)
      );
      const attackOk = !mine && !!this.selectedAttacker && !(state.board || []).length;
      if (spellOk || attackOk) this.useTarget('hero');
    });
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
      view.setDepth(mine ? 12 : 8);
      this.cardViews.set(minion.instanceId, view);
      view.on('pointerup', (pointer) => this.handleBoardCardClick(minion, mine, isMyTurn, pointer));
    });
  }

  handleBoardCardClick(minion, mine, isMyTurn, pointer) {
    const pending = this.selectedSpell?.card;
    const side = this.targetSide(pending);
    const canBeSpellTarget = !!pending && (
      (side === 'enemy' && !mine && !minion.stealth)
      || (side === 'ally' && mine)
    );
    const canBeAttackTarget = !mine && !!this.selectedAttacker && !minion.stealth;
    if (canBeSpellTarget || canBeAttackTarget) {
      if (!this.canAcceptTargetNow()) return;
      if (!this.consumeCardGesture(pointer)) return;
      this.useTarget(minion.instanceId);
      return;
    }
    if (mine && isMyTurn && minion.canAttack && !this.selectedSpell) {
      if (!this.consumeCardGesture(pointer)) return;
      this.selectedAttacker = this.selectedAttacker === minion.instanceId ? null : minion.instanceId;
      this.selectedSpell = null;
      this._blockTargetsUntil = performance.now() + 220;
      this.updateSelectionVisuals();
    }
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
      view.setDepth(20);
      this.cardViews.set(slot.instanceId, view);
      const hasMana = me.mana >= (card.manaCost ?? 0);
      const boardFull = (me.board || []).length >= 7;
      const canPlay = isMyTurn && hasMana && (slot.cardType === 'SPELL' || !boardFull);
      view.setAlpha(canPlay ? 1 : 0.48);
      if (!canPlay) return;
      view.on('pointerup', (pointer) => {
        if (pointer?.button > 0) return;
        const moved = Math.hypot(
          (pointer?.x ?? 0) - (pointer?.downX ?? pointer?.x ?? 0),
          (pointer?.y ?? 0) - (pointer?.downY ?? pointer?.y ?? 0),
        );
        if (moved > 28) return;
        if (!this.consumeCardGesture(pointer)) return;
        if (this.needsTarget(card)) {
          this.selectedSpell = this.selectedSpell?.instanceId === slot.instanceId
            ? null
            : { ...slot, card };
          this.selectedAttacker = null;
          // Prevent the same tap from also resolving a board/hero target under the finger.
          this._blockTargetsUntil = performance.now() + 220;
          this.updateSelectionVisuals();
          return;
        }
        this.playCard(slot.instanceId, (me.board || []).length, null);
      });
    });
  }

  async playCard(instanceId, targetPosition, targetInstanceId) {
    try {
      // Sound only when a hand card is actually played onto the board.
      const handView = this.cardViews.get(instanceId);
      if (handView) handView.playCardEffect('play', { sound: true });
      else playCardSound(this.findHandCard(instanceId));
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
    const isPlayer1 = this.isMe(this.match?.player1Id);
    const me = isPlayer1 ? this.match?.gameState?.player1 : this.match?.gameState?.player2;
    const slot = (me?.hand || []).find((item) => item.instanceId === instanceId);
    if (!slot) return null;
    return this.getCard(slot.cardType, slot.cardId) || slot;
  }

  async attack(attackerInstanceId, targetInstanceId) {
    try {
      const attackerView = this.cardViews.get(attackerInstanceId);
      // Attack action plays attack sound (not the hand-play sound).
      attackerView?.playCardEffect('attack', { sound: true });
      if (!attackerView) {
        const source = this.getCard('MINION', this.findBoardMinion(attackerInstanceId)?.cardId);
        playCardSound(source, 'attack');
      }
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

  findBoardMinion(instanceId) {
    const gs = this.match?.gameState;
    return [...(gs?.player1?.board || []), ...(gs?.player2?.board || [])]
      .find((m) => m.instanceId === instanceId) || null;
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
      const isPlayer1 = this.isMe(this.match?.player1Id);
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
      if (!prev) view.playCardEffect('play', { sound: false });
      else if (prev.currentHealth !== next.currentHealth) view.playHitEffect();
    });

    const isPlayer1 = this.isMe(this.match.player1Id);
    const prevMe = isPlayer1 ? previous.gameState.player1 : previous.gameState.player2;
    const nextMe = isPlayer1 ? this.match.gameState.player1 : this.match.gameState.player2;
    const prevFatigue = prevMe?.fatigueCounter || 0;
    const nextFatigue = nextMe?.fatigueCounter || 0;
    if (nextFatigue > prevFatigue) {
      const lost = Math.max(0, (prevMe?.health || 0) - (nextMe?.health || 0));
      this.addMessage(
        lost > 0 ? `Усталость: −${lost} HP (колода пуста)` : 'Усталость: колода пуста',
        '#ffb3b3',
      );
    }
  }
}

export default MatchScene;
