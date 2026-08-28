import { DEFAULT_HERO_ID } from '../game/shared';

export function hashString(value) {
  let hash = 0;
  const text = String(value || '');
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

export function imageTextureKey(url) {
  return `remote-image-${hashString(url)}`;
}

export function circularAvatarKey(url, size) {
  return `avatar-circle-${hashString(url)}-${Math.round(size)}`;
}

export function deckHeroId(deck) {
  return deck?.heroId || DEFAULT_HERO_ID;
}

export function escapeAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.cards)) return value.cards;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

export function errorMessage(err, fallback = 'Ошибка') {
  const status = err?.response?.status;
  const raw = err?.response?.data?.message || err?.message || '';
  const code = err?.code || '';

  if (/Batch update returned unexpected row count|ObjectOptimisticLockingFailureException|OptimisticLock/i.test(raw)) {
    return 'Данные уже изменились. Обновите экран и повторите сохранение.';
  }

  // Network / timeout — never show axios "timeout of 15000ms exceeded"
  const noResponse = !err?.response;
  const isTimeout =
    code === 'ECONNABORTED'
    || code === 'ERR_CANCELED'
    || /timeout/i.test(String(raw))
    || /ms exceeded/i.test(String(raw))
    || /ms executed/i.test(String(raw));
  const isNetwork =
    code === 'ERR_NETWORK'
    || code === 'ECONNREFUSED'
    || code === 'ENOTFOUND'
    || code === 'ECONNRESET'
    || (noResponse && !raw);

  if (isTimeout) {
    return 'Сервер не ответил вовремя. Проверьте сеть и попробуйте ещё раз.';
  }
  if (isNetwork || (noResponse && raw && /network|failed to fetch|load failed|net::/i.test(raw))) {
    return 'Сервер недоступен. Проверьте подключение к интернету.';
  }
  if (status === 502 || status === 503 || status === 504) {
    return 'Сервер временно недоступен. Попробуйте чуть позже.';
  }

  return raw || fallback;
}
