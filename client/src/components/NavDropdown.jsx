import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

/**
 * @param {string} label — текст на кнопке
 * @param {{ to: string, label: string, variant?: 'primary' }[]} items
 * @param {string} [buttonClassName]
 * @param {'left'|'right'} [menuAlign]
 */
export default function NavDropdown({
  label,
  items,
  buttonClassName = 'btn btn-outline',
  menuAlign = 'right',
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div
      className={`nav-dropdown ${menuAlign === 'left' ? 'nav-dropdown--menu-left' : ''}`}
      ref={rootRef}
    >
      <button
        type="button"
        className={`nav-dropdown-trigger ${buttonClassName}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="nav-dropdown-label">{label}</span>
        <span className="nav-dropdown-caret" aria-hidden>{open ? '\u25B2' : '\u25BC'}</span>
      </button>
      {open && (
        <div className="nav-dropdown-menu" role="menu">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-dropdown-item ${item.variant === 'primary' ? 'nav-dropdown-item--primary' : ''}`}
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
