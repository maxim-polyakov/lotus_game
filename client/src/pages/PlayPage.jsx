import api from '../api/client';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  ACTIVE_MATCH_KEY,
  DEFAULT_HERO_ID,
  palette,
  session,
  layoutInfo,
} from '../game/shared';
import { BaseScene } from '../components/TutorialModal';
import { matchSocket } from '../components/WaitingMatch';
import { deckHeroId } from '../components/ErrorDetail';

export class PlayScene extends BaseScene {
  constructor() {
    super('PlayScene');
  }

  create() {
    this.cleanupWaiting();
    this.events.once('shutdown', () => this.cleanupWaiting());
    this.drawBackground('Поиск матча');
    this.addBackButton();
    this.addMessage('Загрузка колод и героев...', palette.text, GAME_HEIGHT / 2);
    this.mode = 'RANKED';
    this.selectedDeckIndex = 0;
    this.selectedHeroIndex = 0;
    Promise.all([
      api.get('/api/decks').then(({ data }) => data || []),
      api.get('/api/cards').then(({ data }) => data || []),
      api.get('/api/heroes').then(({ data }) => data || []),
    ]).then(([decks, cards, heroes]) => {
      this.decks = decks;
      this.cards = cards;
      this.heroes = heroes.filter((h) => h.unlocked !== false);
      const heroIndex = this.heroes.findIndex((h) => h.id === session.selectedHeroId);
      this.selectedHeroIndex = Math.max(0, heroIndex);
      this.render();
    }).catch((err) => this.renderError(err.response?.data?.message || err.message || 'Ошибка загрузки'));
  }

  renderError(message) {
    this.clearScene();
    this.drawBackground('Поиск матча');
    this.addBackButton();
    this.addMessage(message, '#ffb3b3', GAME_HEIGHT / 2);
  }

  render(status = '') {
    this.clearScene();
    const layout = layoutInfo();
    this.drawBackground('Поиск матча');
    this.addBackButton();
    const panelY = layout.portrait ? 420 : 360;
    const panelH = layout.portrait ? 560 : 450;
    this.addPanel(layout.centerX, panelY, layout.portrait ? 620 : 760, panelH);
    const hero = this.heroes[this.selectedHeroIndex];
    const decks = hero ? this.decks.filter((d) => deckHeroId(d) === hero.id) : [];
    const deck = decks[this.selectedDeckIndex] || decks[0];

    const infoY = layout.portrait ? 200 : 180;
    this.add.text(layout.centerX, infoY, `Герой: ${hero?.name || 'нет доступных героев'}`, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: layout.portrait ? '22px' : '24px',
      color: palette.text,
      wordWrap: { width: layout.portrait ? 560 : 700 },
      align: 'center',
    }).setOrigin(0.5);
    this.add.text(layout.centerX, infoY + 55, `Колода: ${deck?.name || 'нет колоды для героя'}`, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: layout.portrait ? '20px' : '22px',
      color: deck ? palette.text : '#ffb3b3',
      wordWrap: { width: layout.portrait ? 560 : 700 },
      align: 'center',
    }).setOrigin(0.5);
    this.add.text(layout.centerX, infoY + 105, `Режим: ${this.mode}`, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '20px',
      color: palette.muted,
    }).setOrigin(0.5);

    const cycleHero = () => {
      this.selectedHeroIndex = (this.selectedHeroIndex + 1) % Math.max(1, this.heroes.length);
      session.selectedHeroId = this.heroes[this.selectedHeroIndex]?.id || DEFAULT_HERO_ID;
      localStorage.setItem('lotus_selected_hero_id', session.selectedHeroId);
      this.selectedDeckIndex = 0;
      this.render();
    };
    const cycleDeck = () => {
      this.selectedDeckIndex = (this.selectedDeckIndex + 1) % Math.max(1, decks.length);
      this.render();
    };
    const cycleMode = () => {
      this.mode = this.mode === 'RANKED' ? 'CASUAL' : 'RANKED';
      this.render();
    };

    if (layout.portrait) {
      const btnY = 380;
      this.addButton(layout.centerX - 150, btnY, 180, 48, 'Герой +', cycleHero);
      this.addButton(layout.centerX + 150, btnY, 180, 48, 'Колода +', cycleDeck);
      this.addButton(layout.centerX, btnY + 70, 200, 48, 'Режим', cycleMode);
      this.addButton(layout.centerX, btnY + 160, 280, 56, 'Найти матч', () => this.findMatch(deck, hero), {
        fill: palette.primaryDark,
        stroke: palette.primary,
        fontSize: 22,
      });
      if (status) this.addMessage(status, palette.text, btnY + 250);
    } else {
      this.addButton(440, 360, 170, 44, 'Герой +', cycleHero);
      this.addButton(640, 360, 170, 44, 'Колода +', cycleDeck);
      this.addButton(840, 360, 170, 44, 'Режим', cycleMode);
      this.addButton(GAME_WIDTH / 2, 460, 260, 56, 'Найти матч', () => this.findMatch(deck, hero), {
        fill: palette.primaryDark,
        stroke: palette.primary,
        fontSize: 22,
      });
      if (status) this.addMessage(status, palette.text, 555);
    }
  }

  async findMatch(deck, hero) {
    if (!deck || !hero) {
      this.render('Выберите героя и колоду.');
      return;
    }
    this.render('Поиск соперника...');
    try {
      let match;
      try {
        match = await matchSocket.findMatch(deck.id, this.mode, hero.id);
      } catch {
        const { data } = await api.post('/api/matches/find', null, {
          params: { deckId: deck.id, mode: this.mode, heroId: hero.id },
        });
        match = data;
      }
      sessionStorage.setItem(ACTIVE_MATCH_KEY, String(match.id));
      if (match.status === 'WAITING') {
        this.waitForMatch(match.id);
      } else {
        this.scene.start('MatchScene', { match, cards: this.cards });
      }
    } catch (err) {
      this.render(err.response?.data?.message || err.message || 'Не удалось найти матч');
    }
  }

  waitForMatch(matchId) {
    this.cleanupWaiting();
    this.render(`Ожидание соперника. Матч #${matchId}`);
    const openMatch = (match) => {
      if (!match || match.status === 'WAITING') return;
      this.cleanupWaiting();
      this.scene.start('MatchScene', { match, cards: this.cards });
    };
    matchSocket.connect()
      .then(() => {
        this.waitingUnsubscribe = matchSocket.subscribeMatch(matchId, openMatch);
      })
      .catch(() => {});
    this.waitingEvent = this.time.addEvent({
      delay: 2000,
      loop: true,
      callback: async () => {
        try {
          const { data } = await api.get(`/api/matches/${matchId}`);
          openMatch(data);
        } catch (err) {
          this.render(err.response?.data?.message || err.message || 'Ошибка ожидания матча');
        }
      },
    });
  }

  cleanupWaiting() {
    this.waitingEvent?.remove(false);
    this.waitingEvent = null;
    this.waitingUnsubscribe?.();
    this.waitingUnsubscribe = null;
  }
}

export default PlayScene;
