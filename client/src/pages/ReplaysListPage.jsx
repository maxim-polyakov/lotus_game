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
    this.events.once('shutdown', () => this.teardownScroll());
    this._scrollY = 0;
    this.drawBackground('Реплеи');
    this.addBackButton();
    this.addMessage('Загрузка матчей...', palette.text, 120);
    api.get('/api/matches')
      .then(({ data }) => this.renderReplays((data || []).filter((m) => m.status === 'FINISHED')))
      .catch((err) => this.renderReplays([], err.response?.data?.message || err.message || 'Ошибка загрузки'));
  }

  teardownScroll() {
    this._scrollHandlers?.forEach((off) => {
      try { off(); } catch { /* ignore */ }
    });
    this._scrollHandlers = [];
    this._dragScroll = null;
    this._scrollbarDrag = null;
    if (this.cameras?.main) this.cameras.main.setScroll(0, 0);
  }

  pin(obj, depth = 3000) {
    if (!obj) return obj;
    obj.setScrollFactor?.(0);
    if (typeof depth === 'number') obj.setDepth?.(depth);
    if (obj.list) obj.list.forEach((child) => this.pin(child, depth));
    return obj;
  }

  setupScroll(contentBottom) {
    this.teardownScroll();
    const maxScroll = Math.max(0, contentBottom - GAME_HEIGHT + 40);
    this._maxScroll = maxScroll;
    this._scrollY = Math.min(this._scrollY || 0, maxScroll);
    this.cameras.main.setScroll(0, this._scrollY);
    this.updateScrollbarThumb();

    const applyScroll = (next) => {
      this._scrollY = Math.max(0, Math.min(maxScroll, next));
      this.cameras.main.setScroll(0, this._scrollY);
      this.updateScrollbarThumb();
    };

    const onWheel = (_pointer, _over, _dx, dy) => {
      applyScroll((this._scrollY || 0) + dy * 0.55);
    };
    const onDown = (pointer) => {
      if (this._scrollbarHit?.(pointer)) {
        this._scrollbarDrag = {
          startY: pointer.y,
          startScroll: this._scrollY || 0,
        };
        return;
      }
      this._dragScroll = {
        startY: pointer.y,
        startScroll: this._scrollY || 0,
        moved: false,
      };
    };
    const onMove = (pointer) => {
      if (this._scrollbarDrag && pointer.isDown) {
        const track = this._scrollbarTrack;
        if (!track || maxScroll <= 0) return;
        const usable = Math.max(1, track.height - (this._scrollbarThumb?.displayHeight || 40));
        const dy = pointer.y - this._scrollbarDrag.startY;
        applyScroll(this._scrollbarDrag.startScroll + (dy / usable) * maxScroll);
        return;
      }
      if (!this._dragScroll || !pointer.isDown) return;
      const dy = this._dragScroll.startY - pointer.y;
      if (Math.abs(dy) > 10) this._dragScroll.moved = true;
      applyScroll(this._dragScroll.startScroll + dy);
    };
    const onUp = () => {
      this._replayDragMoved = !!this._dragScroll?.moved;
      this._dragScroll = null;
      this._scrollbarDrag = null;
      this.time?.delayedCall?.(80, () => { this._replayDragMoved = false; });
    };

    this.input.on('wheel', onWheel);
    this.input.on('pointerdown', onDown);
    this.input.on('pointermove', onMove);
    this.input.on('pointerup', onUp);
    this.input.on('pointerupoutside', onUp);

    this._scrollHandlers = [
      () => this.input?.off('wheel', onWheel),
      () => this.input?.off('pointerdown', onDown),
      () => this.input?.off('pointermove', onMove),
      () => this.input?.off('pointerup', onUp),
      () => this.input?.off('pointerupoutside', onUp),
    ];
  }

  wasDragging() {
    return !!this._replayDragMoved || !!this._dragScroll?.moved || !!this._scrollbarDrag;
  }

  drawScrollbar(maxScroll) {
    const layout = layoutInfo();
    const trackX = GAME_WIDTH - (layout.portrait ? 18 : 24);
    const trackTop = layout.portrait ? 110 : 100;
    const trackH = GAME_HEIGHT - trackTop - (layout.portrait ? 110 : 70);
    const track = this.add.rectangle(trackX, trackTop + trackH / 2, 10, trackH, 0x2a3348, 0.9)
      .setStrokeStyle(1, 0x53627a)
      .setScrollFactor(0)
      .setDepth(4000)
      .setInteractive({ useHandCursor: true });
    const thumbH = maxScroll <= 0
      ? trackH
      : Math.max(40, Math.round(trackH * (GAME_HEIGHT / (GAME_HEIGHT + maxScroll))));
    const thumb = this.add.rectangle(trackX, trackTop + thumbH / 2, 10, thumbH, palette.primary, 0.95)
      .setScrollFactor(0)
      .setDepth(4001)
      .setInteractive({ useHandCursor: true, draggable: false });

    this._scrollbarTrack = { x: trackX, top: trackTop, height: trackH };
    this._scrollbarThumb = thumb;
    this._scrollbarHit = (pointer) => {
      const dx = Math.abs(pointer.x - trackX);
      return dx < 18 && pointer.y >= trackTop && pointer.y <= trackTop + trackH;
    };

    track.on('pointerdown', (pointer) => {
      if (maxScroll <= 0) return;
      const usable = Math.max(1, trackH - thumbH);
      const ratio = PhaserMathClamp((pointer.y - trackTop - thumbH / 2) / usable, 0, 1);
      this._scrollY = ratio * maxScroll;
      this.cameras.main.setScroll(0, this._scrollY);
      this.updateScrollbarThumb();
      this._scrollbarDrag = { startY: pointer.y, startScroll: this._scrollY };
    });
  }

  updateScrollbarThumb() {
    const track = this._scrollbarTrack;
    const thumb = this._scrollbarThumb;
    if (!track || !thumb) return;
    const maxScroll = this._maxScroll || 0;
    const thumbH = thumb.displayHeight || thumb.height || 40;
    if (maxScroll <= 0) {
      thumb.y = track.top + thumbH / 2;
      return;
    }
    const usable = Math.max(1, track.height - thumbH);
    const ratio = (this._scrollY || 0) / maxScroll;
    thumb.y = track.top + thumbH / 2 + ratio * usable;
  }

  renderReplays(matches, error = '') {
    this.teardownScroll();
    this.clearScene();
    this.cameras?.main?.setScroll(0, 0);

    const layout = layoutInfo();
    const pageH = Math.max(GAME_HEIGHT * 2, 2000 + matches.length * 100);
    this.add.rectangle(0, 0, GAME_WIDTH, pageH, palette.bg).setOrigin(0).setDepth(0);

    // Sticky header
    const stickyH = 90;
    const stickyFrom = this.children.list.length;
    this.add.rectangle(0, 0, GAME_WIDTH, stickyH, palette.bg, 1).setOrigin(0);
    const logoKey = this.textures.exists('lotus-logo') ? 'lotus-logo' : 'lotus-logo-fallback';
    if (this.textures.exists(logoKey)) {
      this.add.image(58, 52, logoKey).setDisplaySize(48, 48);
    } else {
      this.add.circle(58, 52, 24, palette.primaryDark).setStrokeStyle(2, palette.primary);
      this.add.text(58, 52, 'L', {
        fontFamily: 'Segoe UI, Arial', fontSize: '26px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);
    }
    this.add.text(94, 34, 'Реплеи', {
      fontFamily: 'Segoe UI, Arial',
      fontSize: layout.portrait ? '28px' : '34px',
      color: palette.text,
      fontStyle: 'bold',
    });
    this.add.text(GAME_WIDTH - 92, 42, session.user ? session.user.username : 'Guest', {
      fontFamily: 'Segoe UI, Arial',
      fontSize: layout.portrait ? '15px' : '18px',
      color: palette.muted,
    }).setOrigin(1, 0);
    this.addAvatar(GAME_WIDTH - 58, 53, session.user?.avatarUrl, session.user?.username || 'Guest', 42);
    this.children.list.slice(stickyFrom).forEach((child) => this.pin(child));

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

    const maxScroll = Math.max(0, contentBottom + 60 - GAME_HEIGHT + 40);
    this.drawScrollbar(maxScroll);
    this.setupScroll(contentBottom + 60);
  }
}

function PhaserMathClamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export default ReplaysScene;
