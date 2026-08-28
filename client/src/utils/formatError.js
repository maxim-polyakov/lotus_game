import { errorMessage } from '../components/ErrorDetail';

/**
 * Форматирует ошибку API в подробное описание для отображения пользователю.
 * @param {Error} err - объект ошибки axios/другой
 * @returns {{ short: string, full: string, details: object }}
 */
export function formatApiError(err) {
  if (!err) return { short: 'Неизвестная ошибка', full: 'Неизвестная ошибка', status: null, error: 'Ошибка', path: null, details: {}, raw: {} };
  const data = err?.response?.data || {};
  const status = err?.response?.status;
  const message = errorMessage(err, data.message || err?.message || 'Неизвестная ошибка');
  const errorType = data.error || (status === 500 ? 'Ошибка сервера' : status === 400 ? 'Ошибка запроса' : status === 404 ? 'Не найдено' : status === 403 ? 'Доступ запрещён' : status === 401 ? 'Требуется авторизация' : 'Ошибка');
  const path = data.path || err?.config?.url;
  const details = data.details || {};

  const parts = [];
  parts.push(`[${status ?? '—'}] ${errorType}`);
  parts.push(message);
  if (path) parts.push(`Путь: ${path}`);
  if (Object.keys(details).length > 0) {
    parts.push('Детали: ' + Object.entries(details).map(([k, v]) => `${k}=${v}`).join('; '));
  }

  return {
    short: message,
    full: parts.join('\n'),
    status,
    error: errorType,
    path,
    details,
    raw: data,
  };
}
