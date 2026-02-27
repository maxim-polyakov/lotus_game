import React from 'react';
import { formatApiError } from '../utils/formatError';

/**
 * Подробное отображение ошибки API.
 * @param {Object} err - объект ошибки (axios error)
 * @param {string} context - контекст (например "Розыгрыш карты", "Атака")
 * @param {function} onClose - callback при закрытии
 */
export default function ErrorDetail({ err, context = '', onClose }) {
  if (!err) return null;
  const formatted = formatApiError(err);

  return (
    <div className="error-detail-overlay" onClick={onClose}>
      <div className="error-detail" onClick={(e) => e.stopPropagation()}>
        <div className="error-detail-header">
          <h3>Ошибка {context && `— ${context}`}</h3>
          <button type="button" className="error-detail-close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>
        <div className="error-detail-body">
          <p className="error-detail-message">{formatted.short}</p>
          <dl className="error-detail-meta">
            <dt>Код</dt>
            <dd>{formatted.status ?? '—'}</dd>
            <dt>Тип</dt>
            <dd>{formatted.error}</dd>
            {formatted.path && (
              <>
                <dt>Путь</dt>
                <dd><code>{formatted.path}</code></dd>
              </>
            )}
          </dl>
          {Object.keys(formatted.details).length > 0 && (
            <div className="error-detail-details">
              <h4>Детали</h4>
              <ul>
                {Object.entries(formatted.details).map(([k, v]) => (
                  <li key={k}><strong>{k}:</strong> {String(v)}</li>
                ))}
              </ul>
            </div>
          )}
          <pre className="error-detail-full">{formatted.full}</pre>
        </div>
        <div className="error-detail-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
