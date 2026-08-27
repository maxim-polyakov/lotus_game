export let GAME_WIDTH = 1280;
export let GAME_HEIGHT = 720;
export const LANDSCAPE_WIDTH = 1280;
export const LANDSCAPE_HEIGHT = 720;
export const PORTRAIT_WIDTH = 720;
export const PORTRAIT_HEIGHT = 1280;
export const ACTIVE_MATCH_KEY = 'lotus_active_match_id';
export const DEFAULT_HERO_ID = 'lotus_guardian';
export const THEME_KEY = 'lotus_theme';
export const SOUND_KEY = 'lotus_sound_enabled';

export const THEMES = {
  dark: {
    bg: 0x10141f,
    panel: 0x1d2536,
    panel2: 0x28344b,
    primary: 0xd7aa45,
    primaryDark: 0x936b22,
    text: '#f6ead2',
    muted: '#aab4c8',
    danger: 0xd96b6b,
    ok: 0x64c987,
    cssBg: '#10141f',
  },
  light: {
    bg: 0xe8e0d0,
    panel: 0xf7f1e6,
    panel2: 0xffffff,
    primary: 0xb8892e,
    primaryDark: 0x8a6420,
    text: '#2a2418',
    muted: '#6b6558',
    danger: 0xc45c5c,
    ok: 0x3d9a5f,
    cssBg: '#e8e0d0',
  },
};

/** Mutable palette used by Phaser scenes — always points at the active theme colors. */
export const palette = { ...THEMES.dark };

function readTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'dark';
}

export const session = {
  user: null,
  soundEnabled: localStorage.getItem(SOUND_KEY) !== 'false',
  theme: readTheme(),
  selectedHeroId: localStorage.getItem('lotus_selected_hero_id') || DEFAULT_HERO_ID,
  gameSounds: {},
};

export function applyTheme(theme = session.theme) {
  const next = theme === 'light' ? 'light' : 'dark';
  session.theme = next;
  localStorage.setItem(THEME_KEY, next);
  Object.assign(palette, THEMES[next]);
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', next);
    document.documentElement.style.backgroundColor = THEMES[next].cssBg;
    if (document.body) document.body.style.backgroundColor = THEMES[next].cssBg;
    const root = document.getElementById('lotus-game-root');
    if (root) root.style.backgroundColor = THEMES[next].cssBg;
  }
  return next;
}

export function toggleTheme() {
  return applyTheme(session.theme === 'dark' ? 'light' : 'dark');
}

export function setSoundEnabled(enabled) {
  session.soundEnabled = Boolean(enabled);
  localStorage.setItem(SOUND_KEY, String(session.soundEnabled));
  return session.soundEnabled;
}

export function toggleSound() {
  return setSoundEnabled(!session.soundEnabled);
}

// Apply once on module load so first paint matches stored preference.
applyTheme(session.theme);

function viewportSize() {
  if (typeof window === 'undefined') {
    return { width: LANDSCAPE_WIDTH, height: LANDSCAPE_HEIGHT };
  }
  const vv = window.visualViewport;
  return {
    width: Math.round(vv?.width || window.innerWidth || LANDSCAPE_WIDTH),
    height: Math.round(vv?.height || window.innerHeight || LANDSCAPE_HEIGHT),
  };
}

export function isPortraitViewport() {
  const { width, height } = viewportSize();
  return height > width;
}

export function resolveGameSize() {
  if (isPortraitViewport()) {
    return { width: PORTRAIT_WIDTH, height: PORTRAIT_HEIGHT };
  }
  return { width: LANDSCAPE_WIDTH, height: LANDSCAPE_HEIGHT };
}

export function applyGameSize() {
  const size = resolveGameSize();
  GAME_WIDTH = size.width;
  GAME_HEIGHT = size.height;
  return size;
}

export function layoutInfo() {
  const portrait = GAME_HEIGHT > GAME_WIDTH;
  return {
    portrait,
    narrow: portrait || GAME_WIDTH < 1000,
    centerX: GAME_WIDTH / 2,
    centerY: GAME_HEIGHT / 2,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  };
}
