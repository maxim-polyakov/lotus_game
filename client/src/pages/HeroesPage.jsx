import api from '../api/client';
import { palette, session, layoutInfo } from '../game/shared';
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
      .then(({ data }) => this.renderHeroes(data || []))
      .catch((err) => this.renderHeroes([], err.response?.data?.message || err.message || 'Ошибка загрузки'));
  }

  renderHeroes(heroes, error = '') {
    this.clearScene();
    const layout = layoutInfo();
    this.drawBackground('Герои');
    this.addBackButton();
    if (error) this.addMessage(error, '#ffb3b3', 120);
    heroes.forEach((hero, index) => {
      const columns = layout.portrait ? 2 : 4;
      const x = (layout.portrait ? 210 : 230) + (index % columns) * (layout.portrait ? 300 : 270);
      const y = (layout.portrait ? 210 : 185) + Math.floor(index / columns) * (layout.portrait ? 190 : 180);
      const selected = session.selectedHeroId === hero.id;
      const panel = this.add.rectangle(x, y, layout.portrait ? 260 : 230, 140, hero.unlocked === false ? 0x252a36 : palette.panel2, 0.95)
        .setStrokeStyle(2, selected ? palette.primary : 0x53627a)
        .setInteractive({ useHandCursor: hero.unlocked !== false });
      const avatarY = y - 36;
      this.add.circle(x, avatarY, 34, selected ? palette.primaryDark : 0x3c4964);
      this.add.text(x, avatarY, (hero.name || '?').slice(0, 1).toUpperCase(), {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '30px',
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
      }).setOrigin(0.5);
      this.add.text(x, y + 4, hero.name || hero.id, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '19px',
        color: palette.text,
        align: 'center',
        wordWrap: { width: 200 },
      }).setOrigin(0.5);
      this.add.text(x, y + 42, hero.unlocked === false ? `До открытия: ${hero.gamesUntilUnlock ?? '?'}` : `HP ${hero.startingHealth}`, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '15px',
        color: hero.unlocked === false ? '#ffb3b3' : palette.muted,
      }).setOrigin(0.5);
      if (hero.unlocked !== false) {
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
