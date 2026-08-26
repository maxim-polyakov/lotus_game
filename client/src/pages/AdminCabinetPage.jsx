import api from '../api/client';
import { palette, layoutInfo } from '../game/shared';
import { ListScene } from '../components/TutorialModal';
import { CardGameObject } from '../components/CardDisplay';
import { escapeAttr } from '../components/ErrorDetail';
import './AdminCabinetPage.css';

export class AdminScene extends ListScene {
  constructor() {
    super('AdminScene', 'Админка', async () => [], () => '');
  }

  create() {
    this.selected = null;
    this.formMode = 'edit';
    this.loadAdmin();
  }

  loadAdmin(message = '') {
    this.drawBackground('Админка');
    this.addBackButton();
    this.addMessage('Загрузка админки...', palette.text, 120);
    Promise.all([
      api.get('/api/cards').then(({ data }) => data || []),
      api.get('/api/heroes').then(({ data }) => data || []),
    ]).then(([cards, heroes]) => this.loadCardTextures(cards).then(() => {
      this.cards = cards;
      this.heroes = heroes;
      if (this.selected) {
        this.selected = cards.find((card) => card.id === this.selected.id && card.cardType === this.selected.cardType) || null;
      }
      this.renderAdmin(message);
    })).catch((err) => this.renderAdmin(err.response?.data?.message || err.message || 'Ошибка загрузки'));
  }

  renderAdmin(message = '') {
    this.clearScene();
    const layout = layoutInfo();
    this.drawBackground('Админка');
    this.addBackButton();
    if (message) this.addMessage(message, message.includes('Ошибка') || message.includes('Не') ? '#ffb3b3' : palette.text, layout.portrait ? 1225 : 670);
    this.add.text(80, 95, 'Карты: клик для редактирования', { fontFamily: 'Segoe UI, Arial', fontSize: '18px', color: palette.muted });
    const actionY = layout.portrait ? 145 : 105;
    this.addButton(layout.portrait ? 160 : 760, actionY, 140, 34, 'Новая карта', () => {
      this.formMode = 'create-card';
      this.renderAdmin();
    }, { fontSize: 15 });
    this.addButton(layout.portrait ? 360 : 920, actionY, 140, 34, 'Новый герой', () => {
      this.formMode = 'create-hero';
      this.renderAdmin();
    }, { fontSize: 15 });
    this.addButton(layout.portrait ? 560 : 1080, actionY, 120, 34, 'Редакт.', () => {
      this.formMode = 'edit';
      this.renderAdmin();
    }, { fontSize: 15 });

    const columns = layout.portrait ? 4 : 7;
    const cardLimit = layout.portrait ? 12 : 21;
    const startX = layout.portrait ? 105 : 88;
    const startY = layout.portrait ? 235 : 170;
    const gapX = layout.portrait ? 168 : 84;
    const gapY = layout.portrait ? 120 : 125;
    (this.cards || []).slice(0, cardLimit).forEach((card, index) => {
      const x = startX + (index % columns) * gapX;
      const y = startY + Math.floor(index / columns) * gapY;
      const view = new CardGameObject(this, x, y, card, {
        width: 70,
        height: 98,
        selected: this.selected && this.selected.id === card.id && this.selected.cardType === card.cardType,
      });
      view.on('pointerdown', () => {
        this.selected = card;
        this.formMode = 'edit';
        this.renderAdmin();
      });
    });

    this.addPanel(layout.portrait ? layout.centerX : 955, layout.portrait ? 855 : 365, layout.portrait ? 620 : 430, layout.portrait ? 700 : 520);
    if (this.formMode === 'create-card') {
      this.renderCreateCardForm();
    } else if (this.formMode === 'create-hero') {
      this.renderCreateHeroForm();
    } else if (this.selected) {
      this.renderSelectedCardForm(this.selected);
    } else {
      this.add.text(layout.portrait ? layout.centerX : 955, layout.portrait ? 820 : 335, 'Выберите карту слева', {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '20px',
        color: palette.text,
      }).setOrigin(0.5);
    }
  }

  renderSelectedCardForm(card) {
    const isMinion = card.cardType === 'MINION';
    const layout = layoutInfo();
    const editDom = this.addDomForm(layout.portrait ? layout.centerX : 955, layout.portrait ? 850 : 355, `
      <form class="phaser-form admin-phaser-form">
        <strong>${escapeAttr(card.cardType)} #${card.id}</strong>
        <input name="name" placeholder="Название" value="${escapeAttr(card.name)}" required />
        <input name="manaCost" type="number" placeholder="Мана" value="${escapeAttr(card.manaCost)}" />
        ${isMinion ? `
          <input name="attack" type="number" placeholder="Атака" value="${escapeAttr(card.attack)}" />
          <input name="health" type="number" placeholder="Здоровье" value="${escapeAttr(card.health)}" />
        ` : `
          <input name="damage" type="number" placeholder="Урон" value="${escapeAttr(card.damage)}" />
        `}
        <input name="description" placeholder="Описание" value="${escapeAttr(card.description)}" />
        <button type="submit">Сохранить карту</button>
        <input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" />
        <input name="sound" type="file" accept="audio/*" />
        <input name="effect" type="file" accept="image/gif,video/webm,video/mp4,image/png,image/webp" />
        <button type="button" data-upload-assets>Загрузить ассеты</button>
      </form>
    `, (values) => this.saveCard(card, values));

    const form = editDom.node?.querySelector('form');
    form?.querySelector('[data-upload-assets]')?.addEventListener('click', () => this.uploadCardAssets(card, form));

    this.addButton(layout.portrait ? layout.centerX : 955, layout.portrait ? 1205 : 630, 190, 34, 'Удалить карту', () => this.deleteCard(card), { fill: 0x52303a, stroke: palette.danger, fontSize: 15 });
  }

  renderCreateCardForm() {
    const layout = layoutInfo();
    this.addDomForm(layout.portrait ? layout.centerX : 955, layout.portrait ? 805 : 360, `
      <form class="phaser-form admin-create-form">
        <strong>Создать карту</strong>
        <select name="cardType"><option value="MINION">Миньон</option><option value="SPELL">Заклинание</option></select>
        <input name="name" placeholder="Название" required />
        <input name="manaCost" type="number" placeholder="Мана" value="1" />
        <input name="attack" type="number" placeholder="Атака миньона" value="1" />
        <input name="health" type="number" placeholder="HP миньона" value="1" />
        <input name="damage" type="number" placeholder="Урон заклинания" value="1" />
        <input name="description" placeholder="Описание" />
        <button type="submit">Создать</button>
      </form>
    `, (values) => this.createCard(values));
  }

  renderCreateHeroForm() {
    const layout = layoutInfo();
    this.addDomForm(layout.portrait ? layout.centerX : 955, layout.portrait ? 760 : 330, `
      <form class="phaser-form admin-create-form">
        <strong>Создать героя</strong>
        <input name="id" placeholder="hero_id" required />
        <input name="name" placeholder="Имя" required />
        <input name="title" placeholder="Титул" />
        <input name="startingHealth" type="number" placeholder="HP" value="30" />
        <button type="submit">Создать героя</button>
      </form>
    `, (values) => this.createHero(values));
  }

  async saveCard(card, values) {
    try {
      const isMinion = card.cardType === 'MINION';
      const payload = isMinion
        ? {
            name: values.name,
            manaCost: Number(values.manaCost) || 0,
            attack: Number(values.attack) || 0,
            health: Number(values.health) || 1,
            description: values.description || '',
          }
        : {
            name: values.name,
            manaCost: Number(values.manaCost) || 0,
            damage: Number(values.damage) || 0,
            description: values.description || '',
          };
      const path = isMinion ? `/api/admin/cards/minions/${card.id}` : `/api/admin/cards/spells/${card.id}`;
      const { data } = await api.put(path, payload);
      this.cards = this.cards.map((c) => (c.id === data.id && c.cardType === data.cardType ? data : c));
      this.selected = data;
      this.renderAdmin('Карта сохранена');
    } catch (err) {
      this.renderAdmin(err.response?.data?.message || err.message || 'Не удалось сохранить карту');
    }
  }

  async createCard(values) {
    try {
      const isMinion = values.cardType === 'MINION';
      const payload = isMinion
        ? {
            name: values.name,
            manaCost: Number(values.manaCost) || 0,
            attack: Number(values.attack) || 0,
            health: Number(values.health) || 1,
            description: values.description || '',
          }
        : {
            name: values.name,
            manaCost: Number(values.manaCost) || 0,
            damage: Number(values.damage) || 0,
            description: values.description || '',
          };
      const { data } = await api.post(isMinion ? '/api/admin/cards/minions' : '/api/admin/cards/spells', payload);
      this.cards = [...this.cards, data];
      this.selected = data;
      await this.loadCardTextures([data]);
      this.renderAdmin('Карта создана');
    } catch (err) {
      this.renderAdmin(err.response?.data?.message || err.message || 'Не удалось создать карту');
    }
  }

  async createHero(values) {
    try {
      await api.post('/api/admin/heroes', {
        id: values.id.trim().toLowerCase(),
        name: values.name.trim(),
        title: values.title?.trim() || '',
        startingHealth: Number(values.startingHealth) || 30,
      });
      this.renderAdmin('Герой создан');
    } catch (err) {
      this.renderAdmin(err.response?.data?.message || err.message || 'Не удалось создать героя');
    }
  }

  async deleteCard(card) {
    try {
      const isMinion = card.cardType === 'MINION';
      await api.delete(isMinion ? `/api/admin/cards/minions/${card.id}` : `/api/admin/cards/spells/${card.id}`);
      this.cards = this.cards.filter((c) => !(c.id === card.id && c.cardType === card.cardType));
      this.selected = null;
      this.renderAdmin('Карта удалена');
    } catch (err) {
      this.renderAdmin(err.response?.data?.message || err.message || 'Не удалось удалить карту');
    }
  }

  async uploadCardAssets(card, form) {
    try {
      const isMinion = card.cardType === 'MINION';
      const uploads = [
        ['image', form.elements.image?.files?.[0], isMinion ? `/api/cards/minions/${card.id}/image` : `/api/cards/spells/${card.id}/image`, 'image'],
        ['sound', form.elements.sound?.files?.[0], isMinion ? `/api/cards/minions/${card.id}/sound` : `/api/cards/spells/${card.id}/sound`, 'sound'],
        ['effect', form.elements.effect?.files?.[0], isMinion ? `/api/cards/minions/${card.id}/play-effect` : `/api/cards/spells/${card.id}/play-effect`, 'effect'],
      ].filter(([, file]) => file);
      for (const [, file, endpoint, field] of uploads) {
        const fd = new FormData();
        fd.append(field, file);
        await api.post(endpoint, fd);
      }
      this.loadAdmin('Ассеты загружены');
    } catch (err) {
      this.renderAdmin(err.response?.data?.message || err.message || 'Не удалось загрузить ассеты');
    }
  }
}

export default AdminScene;
