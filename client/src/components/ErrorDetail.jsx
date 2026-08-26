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
  const message = err?.response?.data?.message || err?.message || fallback;
  if (/Batch update returned unexpected row count|ObjectOptimisticLockingFailureException|OptimisticLock/i.test(message)) {
    return 'Данные уже изменились. Обновите экран и повторите сохранение.';
  }
  return message;
}
