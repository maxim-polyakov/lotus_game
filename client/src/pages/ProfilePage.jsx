import api from '../api/client';
import { palette, session } from '../game/shared';
import { ListScene } from '../components/TutorialModal';

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

  renderProfile(me, stats, error = '') {
    this.clearScene();
    this.drawBackground('Профиль');
    this.addBackButton();
    if (error) this.addMessage(error, '#ffb3b3', 120);
    this.addPanel(340, 280, 460, 300);
    this.addAvatar(600, 205, me?.avatarUrl, me?.username, 96);
    this.add.text(150, 170, me ? me.username : 'Пользователь', { fontFamily: 'Segoe UI, Arial', fontSize: '30px', color: palette.text });
    this.add.text(150, 218, me?.email || '', { fontFamily: 'Segoe UI, Arial', fontSize: '18px', color: palette.muted });
    this.add.text(150, 270, `Рейтинг: ${me?.rating ?? 0}`, { fontFamily: 'Segoe UI, Arial', fontSize: '22px', color: '#ffe18c' });
    this.add.text(150, 310, `Золото: ${me?.gold ?? 0}   Пыль: ${me?.dust ?? 0}`, { fontFamily: 'Segoe UI, Arial', fontSize: '20px', color: palette.text });
    this.add.text(150, 360, `Матчи: ${stats?.totalMatches ?? 0} / Победы: ${stats?.wins ?? 0} / Поражения: ${stats?.losses ?? 0}`, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '18px',
      color: palette.muted,
    });
    this.addDomForm(850, 275, `
      <form class="phaser-form">
        <input name="username" placeholder="Username" value="${(me?.username || '').replace(/"/g, '&quot;')}" required />
        <input name="avatarUrl" placeholder="Avatar URL" value="${(me?.avatarUrl || '').replace(/"/g, '&quot;')}" />
        <button type="submit">Сохранить профиль</button>
      </form>
    `, async (values) => {
      try {
        const { data } = await api.put('/api/me', { username: values.username.trim(), avatarUrl: values.avatarUrl.trim() || null });
        session.user = { ...session.user, ...data };
        this.renderProfile(data, stats, 'Профиль сохранён');
      } catch (err) {
        this.renderProfile(me, stats, err.response?.data?.message || err.message || 'Не удалось сохранить');
      }
    });
  }
}

export default ProfileScene;
