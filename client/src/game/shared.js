export let GAME_WIDTH = 1280;
export let GAME_HEIGHT = 720;
export const LANDSCAPE_WIDTH = 1280;
export const LANDSCAPE_HEIGHT = 720;
export const PORTRAIT_WIDTH = 720;
export const PORTRAIT_HEIGHT = 1280;
export const ACTIVE_MATCH_KEY = 'lotus_active_match_id';
export const DEFAULT_HERO_ID = 'lotus_guardian';

export const palette = {
  bg: 0x10141f,
  panel: 0x1d2536,
  panel2: 0x28344b,
  primary: 0xd7aa45,
  primaryDark: 0x936b22,
  text: '#f6ead2',
  muted: '#aab4c8',
  danger: 0xd96b6b,
  ok: 0x64c987,
};

export const session = {
  user: null,
  soundEnabled: localStorage.getItem('lotus_sound_enabled') !== 'false',
  selectedHeroId: localStorage.getItem('lotus_selected_hero_id') || DEFAULT_HERO_ID,
};

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
