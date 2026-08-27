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
    this.panelCollapsed = false;
    this.loadAdmin();
  }

  loadAdmin(message = '') {
    this.clearScene();
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

  setPanelCollapsed(collapsed) {
    this.panelCollapsed = Boolean(collapsed);
    this.renderAdmin();
  }

  renderAdmin(message = '') {
    this.clearScene();
    const layout = layoutInfo();
    this.drawBackground('Админка');
    this.addBackButton();
    if (message) this.addMessage(message, message.includes('Ошибка') || message.includes('Не') ? '#ffb3b3' : palette.text, layout.portrait ? 1225 : 670);

    this.add.text(80, 95, 'Карты: клик для редактирования', { fontFamily: 'Segoe UI, Arial', fontSize: '18px', color: palette.muted });

    const actionY = layout.portrait ? 145 : 130;
    this.addButton(layout.portrait ? 160 : 150, actionY, 150, 34, 'Новая карта', () => {
      this.formMode = 'create-card';
      this.panelCollapsed = false;
      this.renderAdmin();
    }, { fontSize: 15 });
    this.addButton(layout.portrait ? 360 : 320, actionY, 150, 34, 'Новый герой', () => {
      this.formMode = 'create-hero';
      this.panelCollapsed = false;
      this.renderAdmin();
    }, { fontSize: 15 });
    this.addButton(layout.portrait ? 560 : 490, actionY, 130, 34, 'Редакт.', () => {
      this.formMode = 'edit';
      this.panelCollapsed = false;
      this.renderAdmin();
    }, { fontSize: 15 });
    this.addButton(layout.portrait ? 160 : 640, layout.portrait ? actionY + 42 : actionY, 150, 34, 'Пользователи', () => {
      this.formMode = 'users';
      this.panelCollapsed = false;
      this.renderAdmin();
    }, { fontSize: 15 });

    const columns = layout.portrait ? 4 : 6;
    const cardLimit = layout.portrait ? 12 : 18;
    const startX = layout.portrait ? 105 : 88;
    const startY = layout.portrait ? 280 : 210;
    const gapX = layout.portrait ? 168 : 100;
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
        this.panelCollapsed = false;
        this.renderAdmin();
      });
    });

    if (this.panelCollapsed) {
      const expandLabel = this.selected
        ? `Развернуть: ${String(this.selected.name || 'карта').slice(0, 18)}`
        : this.formMode === 'create-card'
          ? 'Развернуть: новая карта'
          : this.formMode === 'create-hero'
            ? 'Развернуть: новый герой'
            : this.formMode === 'users'
              ? 'Развернуть: пользователи'
              : 'Развернуть панель';
      this.addButton(
        layout.centerX,
        layout.portrait ? 1185 : 680,
        layout.portrait ? 360 : 280,
        42,
        expandLabel,
        () => this.setPanelCollapsed(false),
        { fontSize: 16 },
      );
      return;
    }

    const panelX = layout.portrait ? layout.centerX : 1000;
    const panelW = layout.portrait ? 620 : 420;
    const panelH = layout.portrait ? 640 : 560;
    const panelY = layout.portrait ? 880 : 390;
    this._adminPanel = { x: panelX, y: panelY, w: panelW, h: panelH };
    this.addPanel(panelX, panelY, panelW, panelH);

    const modeLabel = this.formMode === 'create-card'
      ? 'Режим: создание карты'
      : this.formMode === 'create-hero'
        ? 'Режим: создание героя'
        : this.formMode === 'users'
          ? 'Режим: пользователи'
          : 'Режим: редактирование';
    this.add.text(panelX, panelY - panelH / 2 - 14, modeLabel, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '15px',
      color: palette.muted,
    }).setOrigin(0.5);

    const collapseY = layout.portrait
      ? panelY - panelH / 2 + 28
      : panelY - panelH / 2 + 24;
    this.addButton(panelX, collapseY, 160, 32, 'Свернуть', () => this.setPanelCollapsed(true), { fontSize: 14 });

    if (this.formMode === 'create-card') {
      this.renderCreateCardForm(panelX, panelY + (layout.portrait ? 18 : 12));
    } else if (this.formMode === 'create-hero') {
      this.renderCreateHeroForm(panelX, panelY + (layout.portrait ? 18 : 12));
    } else if (this.formMode === 'users') {
      this.renderUsersForm(panelX, panelY + (layout.portrait ? 18 : 12));
    } else if (this.selected) {
      this.renderSelectedCardForm(this.selected, panelX, panelY + (layout.portrait ? 18 : 12));
    } else {
      this.add.text(panelX, panelY, 'Выберите карту слева', {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '20px',
        color: palette.text,
      }).setOrigin(0.5);
    }
  }

  renderSelectedCardForm(card, panelX, panelY) {
    const isMinion = card.cardType === 'MINION';
    const layout = layoutInfo();
    const assets = this.assetStatus(card);
    const panelH = this._adminPanel?.h || (layout.portrait ? 640 : 560);
    const formMaxH = Math.max(240, panelH - 70);

    const editDom = this.addDomForm(panelX, panelY, `
      <form class="phaser-form admin-phaser-form" style="max-height:${formMaxH}px">
        <div class="admin-form-head">
          <strong>${escapeAttr(card.cardType)} #${card.id}</strong>
          <button type="button" data-collapse-panel class="admin-collapse-btn">Свернуть</button>
        </div>
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

        <div class="admin-upload-block">
          <strong class="admin-upload-title">Загрузка файлов</strong>
          ${this.uploadFieldHtml('image', 'Картинка на карте', 'image/png,image/jpeg,image/webp,image/gif', assets.image)}
          ${this.uploadFieldHtml('sound', 'Звук розыгрыша', 'audio/*', assets.sound)}
          ${isMinion ? this.uploadFieldHtml('attackSound', 'Звук атаки', 'audio/*', assets.attackSound) : ''}
          ${this.uploadFieldHtml('effect', 'GIF розыгрыша', 'image/gif,video/webm,video/mp4,image/png,image/webp', assets.playGif)}
          ${isMinion ? this.uploadFieldHtml('attackEffect', 'GIF атаки', 'image/gif,video/webm,video/mp4,image/png,image/webp', assets.attackGif) : ''}
          <button type="button" data-upload-assets>Загрузить выбранные файлы</button>
        </div>
      </form>
    `, (values) => this.saveCard(card, values));

    const form = editDom.node?.querySelector('form');
    form?.querySelectorAll('input[type="file"]').forEach((input) => {
      input.addEventListener('change', () => {
        const nameNode = input.parentElement?.querySelector('[data-file-name]');
        if (nameNode) nameNode.textContent = input.files?.[0]?.name || 'Файл не выбран';
      });
    });
    form?.querySelector('[data-upload-assets]')?.addEventListener('click', () => this.uploadCardAssets(card, form));
    form?.querySelector('[data-collapse-panel]')?.addEventListener('click', () => this.setPanelCollapsed(true));

    const deleteY = layout.portrait
      ? panelY + panelH / 2 + 10
      : Math.min(690, panelY + panelH / 2 + 10);
    this.addButton(panelX, deleteY, 190, 34, 'Удалить карту', () => this.deleteCard(card), {
      fill: 0x52303a,
      stroke: palette.danger,
      fontSize: 15,
    });
  }

  uploadFieldHtml(name, label, accept, exists) {
    return `
      <label class="admin-upload-field">
        <span class="admin-upload-label">${label} <em class="${exists ? 'on' : 'off'}">${exists ? 'уже есть' : 'нет'}</em></span>
        <span class="admin-file-picker">
          <input name="${name}" type="file" accept="${accept}"
            style="position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;font-size:0;" />
          <span class="admin-file-btn" aria-hidden="true">Выбрать файл</span>
          <span class="admin-file-name" data-file-name>Файл не выбран</span>
        </span>
      </label>
    `;
  }

  assetStatus(card) {
    return {
      image: Boolean(card?.imageUrl),
      sound: Boolean(card?.soundUrl),
      attackSound: Boolean(card?.attackSoundUrl),
      playGif: Boolean(card?.playEffectUrl),
      attackGif: Boolean(card?.attackEffectUrl),
      gif: Boolean(card?.playEffectUrl || card?.attackEffectUrl),
    };
  }

  renderCreateCardForm(panelX, panelY) {
    this.addDomForm(panelX, panelY, `
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

  renderCreateHeroForm(panelX, panelY) {
    this.addDomForm(panelX, panelY, `
      <form class="phaser-form admin-create-form">
        <strong>Создать героя</strong>
        <input name="name" placeholder="Имя" required />
        <input name="title" placeholder="Титул" />
        <input name="startingHealth" type="number" placeholder="HP" value="30" />
        <button type="submit">Создать героя</button>
      </form>
    `, (values) => this.createHero(values));
  }

  renderUsersForm(panelX, panelY) {
    this.addDomForm(panelX, panelY - 90, `
      <form class="phaser-form admin-create-form" data-admin-promote>
        <strong>Сделать админом</strong>
        <input name="emailOrUsername" placeholder="Email или username" required />
        <button type="submit">Выдать ROLE_ADMIN</button>
      </form>
    `, (values) => this.promoteAdmin(values));

    this.addDomForm(panelX, panelY + 110, `
      <form class="phaser-form admin-create-form" data-admin-gold>
        <strong>Выдать золото</strong>
        <input name="emailOrUsername" placeholder="Email или username" required />
        <input name="amount" type="number" placeholder="Количество" value="100" min="1" required />
        <button type="submit">Начислить золото</button>
      </form>
    `, (values) => this.grantGold(values));
  }

  async promoteAdmin(values) {
    try {
      await api.post('/api/admin/users/promote-admin', {
        emailOrUsername: values.emailOrUsername.trim(),
      });
      this.renderAdmin(`Пользователь ${values.emailOrUsername.trim()} теперь админ`);
    } catch (err) {
      this.renderAdmin(err.response?.data?.message || err.message || 'Не удалось выдать админку');
    }
  }

  async grantGold(values) {
    try {
      const { data } = await api.post('/api/admin/users/grant-gold', {
        emailOrUsername: values.emailOrUsername.trim(),
        amount: Number(values.amount) || 0,
      });
      this.renderAdmin(`Выдано ${data.grantedGold} золота пользователю ${data.username}. Итого: ${data.totalGold}`);
    } catch (err) {
      this.renderAdmin(err.response?.data?.message || err.message || 'Не удалось выдать золото');
    }
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
      this.formMode = 'edit';
      await this.loadCardTextures([data]);
      this.renderAdmin('Карта создана');
    } catch (err) {
      this.renderAdmin(err.response?.data?.message || err.message || 'Не удалось создать карту');
    }
  }

  async createHero(values) {
    try {
      const { data } = await api.post('/api/admin/heroes', {
        name: values.name.trim(),
        title: values.title?.trim() || '',
        startingHealth: Number(values.startingHealth) || 30,
      });
      this.renderAdmin(`Герой создан (id: ${data?.id || 'ok'})`);
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
        ['attackSound', form.elements.attackSound?.files?.[0], `/api/cards/minions/${card.id}/attack-sound`, 'sound'],
        ['effect', form.elements.effect?.files?.[0], isMinion ? `/api/cards/minions/${card.id}/play-effect` : `/api/cards/spells/${card.id}/play-effect`, 'effect'],
        ['attackEffect', form.elements.attackEffect?.files?.[0], `/api/cards/minions/${card.id}/attack-effect`, 'effect'],
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
