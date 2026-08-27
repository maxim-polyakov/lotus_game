import api from '../api/client';
import { palette, session, layoutInfo, GAME_HEIGHT } from '../game/shared';
import { ListScene } from '../components/TutorialModal';
import { escapeAttr, imageTextureKey, circularAvatarKey } from '../components/ErrorDetail';
import { resolveTextureUrl } from '../components/CardDisplay';
import './AdminCabinetPage.css';

export class ProfileScene extends ListScene {
  constructor() {
    super('ProfileScene', 'Профиль', async () => [], () => '');
  }

  create() {
    this.drawBackground('Профиль');
    this.addBackButton();
    this.addMessage('Загрузка профиля...', palette.text, 120);
    Promise.all([api.get('/api/me'), api.get('/api/me/stats')])
      .then(([meRes, statsRes]) => this.loadImageUrls([meRes.data?.avatarUrl]).then(() => this.renderProfile(meRes.data, statsRes.data)))
      .catch((err) => this.renderProfile(null, null, err.response?.data?.message || err.message || 'Ошибка загрузки'));
  }

  forgetAvatarTextures(url) {
    if (!url) return;
    const resolved = resolveTextureUrl(url);
    const keys = [
      imageTextureKey(resolved),
      circularAvatarKey(resolved, 42),
      circularAvatarKey(resolved, 84),
      circularAvatarKey(resolved, 92),
      circularAvatarKey(resolved, 96),
    ];
    keys.forEach((key) => {
      if (this.textures.exists(key)) this.textures.remove(key);
    });
  }

  renderProfile(me, stats, error = '') {
    this.clearScene();
    const layout = layoutInfo();
    this.drawBackground('Профиль');
    this.addBackButton();
    if (error) {
      this.addMessage(
        error,
        /сохран|загружен/i.test(error) ? palette.text : '#ffb3b3',
        layout.portrait ? GAME_HEIGHT - 90 : 660,
      );
    }

    const leftW = layout.portrait ? 560 : 460;
    const rightW = layout.portrait ? 560 : 400;
    const panelH = layout.portrait ? 340 : 380;
    const leftX = layout.portrait ? layout.centerX : 360;
    const rightX = layout.portrait ? layout.centerX : 920;
    const leftY = layout.portrait ? 360 : 390;
    const rightY = layout.portrait ? 840 : 390;

    this.addPanel(leftX, leftY, leftW, panelH);
    this.addPanel(rightX, rightY, rightW, panelH);

    const avatarSize = layout.portrait ? 84 : 92;
    const avatarY = leftY - panelH / 2 + 78;
    this.addAvatar(leftX, avatarY, me?.avatarUrl, me?.username, avatarSize);

    const textStartY = avatarY + 62;
    const textStyle = { fontFamily: 'Segoe UI, Arial', align: 'center', wordWrap: { width: leftW - 48 } };
    this.add.text(leftX, textStartY, me?.username || 'Пользователь', {
      ...textStyle,
      fontSize: layout.portrait ? '26px' : '28px',
      color: palette.text,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.add.text(leftX, textStartY + 40, me?.email || '', {
      ...textStyle,
      fontSize: '16px',
      color: palette.muted,
    }).setOrigin(0.5, 0);
    this.add.text(leftX, textStartY + 78, `Рейтинг: ${me?.rating ?? 0}`, {
      ...textStyle,
      fontSize: '20px',
      color: '#ffe18c',
    }).setOrigin(0.5, 0);
    this.add.text(leftX, textStartY + 112, `Золото: ${me?.gold ?? 0}    Пыль: ${me?.dust ?? 0}`, {
      ...textStyle,
      fontSize: '18px',
      color: palette.text,
    }).setOrigin(0.5, 0);
    this.add.text(
      leftX,
      textStartY + 148,
      `Матчи: ${stats?.totalMatches ?? 0}  ·  Победы: ${stats?.wins ?? 0}  ·  Поражения: ${stats?.losses ?? 0}`,
      {
        ...textStyle,
        fontSize: '15px',
        color: palette.muted,
      },
    ).setOrigin(0.5, 0);

    const hasAvatar = Boolean(me?.avatarUrl);
    const editDom = this.addDomForm(rightX, rightY, `
      <form class="phaser-form profile-form">
        <strong>Редактирование</strong>
        <input name="username" placeholder="Имя пользователя" value="${escapeAttr(me?.username)}" required />
        <label class="admin-upload-field">
          <span class="admin-upload-label">Аватар <em class="${hasAvatar ? 'on' : 'off'}">${hasAvatar ? 'уже есть' : 'нет'}</em></span>
          <span class="admin-file-picker">
            <input name="avatar" type="file" accept="image/png,image/jpeg,image/webp,image/gif"
              style="position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;font-size:0;" />
            <span class="admin-file-btn" aria-hidden="true">Выбрать файл</span>
            <span class="admin-file-name" data-file-name>Файл не выбран</span>
          </span>
        </label>
        <button type="button" data-upload-avatar>Загрузить аватар</button>
        <button type="submit">Сохранить имя</button>
      </form>
    `, async (values) => {
      try {
        const { data } = await api.put('/api/me', {
          username: values.username.trim(),
        });
        session.user = { ...session.user, ...data, avatarUrl: data.avatarUrl ?? me?.avatarUrl };
        this.renderProfile({ ...me, ...data, avatarUrl: data.avatarUrl ?? me?.avatarUrl }, stats, 'Профиль сохранён');
      } catch (err) {
        this.renderProfile(me, stats, err.response?.data?.message || err.message || 'Не удалось сохранить');
      }
    });

    const form = editDom.node?.querySelector('form');
    form?.querySelector('input[type="file"]')?.addEventListener('change', (event) => {
      const nameNode = form.querySelector('[data-file-name]');
      const file = event.target.files?.[0];
      if (nameNode) nameNode.textContent = file?.name || 'Файл не выбран';
    });
    form?.querySelector('[data-upload-avatar]')?.addEventListener('click', () => this.uploadAvatar(me, stats, form));
  }

  async uploadAvatar(me, stats, form) {
    const file = form?.elements?.avatar?.files?.[0];
    if (!file) {
      this.renderProfile(me, stats, 'Выберите файл аватара');
      return;
    }
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const { data } = await api.post('/api/me/avatar', fd);
      this.forgetAvatarTextures(me?.avatarUrl);
      this.forgetAvatarTextures(data?.avatarUrl);
      session.user = { ...session.user, ...data };
      await this.loadImageUrls([data?.avatarUrl]);
      this.renderProfile({ ...me, ...data }, stats, 'Аватар загружен');
    } catch (err) {
      this.renderProfile(me, stats, err.response?.data?.message || err.message || 'Не удалось загрузить аватар');
    }
  }
}

export default ProfileScene;
