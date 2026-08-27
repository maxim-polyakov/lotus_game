import api from '../api/client';
import { palette, session, layoutInfo, GAME_HEIGHT } from '../game/shared';
import { ListScene } from '../components/TutorialModal';

export class HeroesScene extends ListScene {
  constructor() {
    super('HeroesScene', 'Герои', async () => [], () => '');
  }

  create() {
    this.drawBackground('Герои');
    this.addBackButton();
    this.addMessage('Загрузка героев...', palette.text, 120);
    api.get('/api/heroes')
      .then(({ data }) => {
        const heroes = data || [];
        return this.loadImageUrls(heroes.map((h) => h.portraitUrl)).then(() => this.renderHeroes(heroes));
      })
      .catch((err) => this.renderHeroes([], err.response?.data?.message || err.message || 'Ошибка загрузки'));
  }

  renderHeroes(heroes, error = '') {
    this.clearScene();
    const layout = layoutInfo();
    this.drawBackground('Герои');
    this.addBackButton();
    if (error) this.addMessage(error, '#ffb3b3', 120);
    if (!heroes.length && !error) {
      this.addMessage('Нет доступных героев', palette.muted, GAME_HEIGHT / 2);
      return;
    }

    heroes.forEach((hero, index) => {
      const columns = layout.portrait ? 2 : 4;
      const panelW = layout.portrait ? 280 : 240;
      const panelH = layout.portrait ? 200 : 180;
      const gapX = layout.portrait ? 320 : 280;
      const gapY = layout.portrait ? 230 : 210;
      const startX = layout.portrait ? 200 : 230;
      const startY = layout.portrait ? 220 : 200;
      const x = startX + (index % columns) * gapX;
      const y = startY + Math.floor(index / columns) * gapY;
      const selected = session.selectedHeroId === hero.id;
      const locked = hero.unlocked === false;
      const panel = this.add.rectangle(x, y, panelW, panelH, locked ? 0x252a36 : palette.panel2, 0.95)
        .setStrokeStyle(2, selected ? palette.primary : 0x53627a)
        .setInteractive({ useHandCursor: !locked });
      this.addAvatar(x, y - 48, hero.portraitUrl, hero.name || '?', 64);
      this.add.text(x, y + 28, hero.name || hero.id, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '19px',
        color: palette.text,
        align: 'center',
        wordWrap: { width: panelW - 24 },
      }).setOrigin(0.5);
      this.add.text(x, y + 62, locked ? `До открытия: ${hero.gamesUntilUnlock ?? '?'}` : `HP ${hero.startingHealth}`, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '15px',
        color: locked ? '#ffb3b3' : palette.muted,
      }).setOrigin(0.5);
      if (!locked) {
        panel.on('pointerdown', () => {
          session.selectedHeroId = hero.id;
          localStorage.setItem('lotus_selected_hero_id', hero.id);
          this.renderHeroes(heroes);
        });
      }
    });
  }
}

export default HeroesScene;
