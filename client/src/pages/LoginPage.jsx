import api, { API_BASE } from '../api/client';
import { setTokens } from '../utils/tokenStorage';
import { layoutInfo } from '../game/shared';
import { BaseScene } from '../components/TutorialModal';
import { loadCurrentUser, loginUser, consumeAuthUrlError, ensureFriendOnlineScene } from '../components/FriendOnlinePopup';
import { ensureChatScene } from '../components/ChatWidget';

const GOOGLE_ICON = `
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 6.168-2.172l-2.908-2.258c-.806.54-1.837.86-3.26.86-2.513 0-4.646-1.697-5.696-4.03H.276v2.33C1.98 15.983 5.316 18 9 18z"/>
    <path fill="#FBBC05" d="M3.304 10.71c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V6.29H.276C-.23 7.174-.5 8.068-.5 9c0 .932.27 1.826.744 2.62l2.56-1.97z"/>
    <path fill="#EA4335" d="M9 3.58c1.414 0 2.69.486 3.696 1.418l2.76-2.764C13.463.696 11.426 0 9 0 5.316 0 1.98 2.017.276 4.83L3.304 7.1C4.354 4.767 6.487 3.07 9 3.07z"/>
  </svg>`;

export class AuthScene extends BaseScene {
  constructor() {
    super('AuthScene');
  }

  create(data = {}) {
    this.mode = data.mode || 'login';
    const urlError = consumeAuthUrlError();
    this.render(data.error || urlError || '');
  }

  render(error = '') {
    this.clearScene();
    const layout = layoutInfo();
    const title = this.mode === 'register'
      ? 'Регистрация'
      : this.mode === 'forgot'
        ? 'Сброс пароля'
        : this.mode === 'verify'
          ? 'Подтверждение email'
          : 'Вход';
    this.drawBackground(title);

    const formY = layout.portrait ? Math.round(layout.centerY - 40) : Math.round(layout.centerY + 10);
    const dom = this.addDomForm(layout.centerX, formY, this.formHtml(layout), (values) => this.submit(values));
    this.bindModeLinks(dom);

    if (error) {
      this.addMessage(error, '#ffb3b3', layout.portrait ? formY + 380 : formY + 320);
    }
  }

  bindModeLinks(dom) {
    const root = dom?.node;
    if (!root) return;
    root.querySelectorAll('[data-auth-mode]').forEach((el) => {
      el.addEventListener('click', (event) => {
        event.preventDefault();
        const mode = el.getAttribute('data-auth-mode');
        if (mode) this.scene.restart({ mode });
      });
    });
  }

  modeNavHtml(layout) {
    const navClass = layout.portrait ? 'auth-mode-nav auth-mode-nav--stack' : 'auth-mode-nav auth-mode-nav--row';
    return `
      <div class="${navClass}">
        <button type="button" data-auth-mode="login">Вход</button>
        <button type="button" data-auth-mode="register">Регистрация</button>
        <button type="button" data-auth-mode="forgot">Забыли пароль</button>
      </div>`;
  }

  googleButtonHtml(label) {
    return `
      <a class="auth-google-btn" href="${API_BASE}/oauth2/authorization/google">
        ${GOOGLE_ICON}
        <span>${label}</span>
      </a>
      <div class="auth-divider">или</div>`;
  }

  formHtml(layout = layoutInfo()) {
    const nav = this.modeNavHtml(layout);
    if (this.mode === 'register') {
      return `
        <form class="phaser-form auth-form">
          ${this.googleButtonHtml('Зарегистрироваться через Google')}
          <input name="username" placeholder="Username" minlength="2" required />
          <input name="email" type="email" placeholder="Email" required />
          <input name="password" type="password" placeholder="Password" minlength="6" required />
          <button type="submit">Создать аккаунт</button>
          ${nav}
        </form>`;
    }
    if (this.mode === 'verify') {
      return `
        <form class="phaser-form auth-form">
          <input name="email" type="email" placeholder="Email" required />
          <input name="code" placeholder="Код подтверждения" required />
          <button type="submit">Подтвердить</button>
          ${nav}
        </form>`;
    }
    if (this.mode === 'forgot') {
      return `
        <form class="phaser-form auth-form">
          <input name="email" type="email" placeholder="Email" required />
          <input name="code" placeholder="Код, если уже пришёл" />
          <input name="newPassword" type="password" placeholder="Новый пароль" minlength="6" />
          <button type="submit">Отправить / сбросить</button>
          ${nav}
        </form>`;
    }
    return `
      <form class="phaser-form auth-form">
        ${this.googleButtonHtml('Войти через Google')}
        <input name="usernameOrEmail" placeholder="Username или email" required />
        <input name="password" type="password" placeholder="Password" required />
        <label class="auth-remember">
          <input name="rememberMe" type="checkbox" value="yes" />
          <span>Запомнить меня</span>
        </label>
        <button type="submit">Войти</button>
        ${nav}
      </form>`;
  }

  async submit(values) {
    try {
      if (this.mode === 'register') {
        await api.post('/api/auth/register', values);
        this.scene.restart({ mode: 'verify' });
        return;
      }
      if (this.mode === 'verify') {
        const { data } = await api.post('/api/auth/verify-email', values);
        setTokens(data.accessToken, data.refreshToken, true);
        await loadCurrentUser();
        ensureChatScene(this);
        ensureFriendOnlineScene(this);
        this.goto('MenuScene');
        return;
      }
      if (this.mode === 'forgot') {
        if (values.code && values.newPassword) {
          await api.post('/api/auth/reset-password', values);
          this.scene.restart({ mode: 'login' });
        } else {
          await api.post('/api/auth/forgot-password', { email: values.email });
          this.render('Код отправлен на email. Введите код и новый пароль.');
        }
        return;
      }
      await loginUser(values.usernameOrEmail, values.password, values.rememberMe === 'yes');
      ensureChatScene(this);
      ensureFriendOnlineScene(this);
      this.goto('MenuScene');
    } catch (err) {
      let msg = err.response?.data?.message || err.message || 'Ошибка';
      if (!err.response?.data?.message) {
        if (err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED') {
          msg = 'Сервер недоступен. Проверьте подключение к интернету и URL API.';
        } else if (err.response?.status === 400 && this.mode === 'login') {
          msg = 'Неверный логин или пароль.';
        }
      }
      this.render(msg);
    }
  }
}

export default AuthScene;
