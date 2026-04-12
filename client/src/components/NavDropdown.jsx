import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  const [menuStyle, setMenuStyle] = useState(null);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }
    const place = () => {
      const el = triggerRef.current;
      if (!el) {
        setMenuStyle(null);
        return;
      }
      const r = el.getBoundingClientRect();
      const menuWidth = Math.max(r.width, 176);
      let left = menuAlign === 'right' ? r.right - menuWidth : r.left;
      left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));
      setMenuStyle({
        position: 'fixed',
        top: r.bottom + 6,
        left,
        minWidth: menuWidth,
        zIndex: 500,
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, menuAlign]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      const t = e.target;
      if (rootRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
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

  const menuNode =
    open &&
    menuStyle &&
    createPortal(
      <div
        ref={menuRef}
        className="nav-dropdown-menu nav-dropdown-menu--portal"
        style={menuStyle}
        role="menu"
      >
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
      </div>,
      document.body
    );

  return (
    <div
      className={`nav-dropdown ${menuAlign === 'left' ? 'nav-dropdown--menu-left' : ''}`}
      ref={rootRef}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`nav-dropdown-trigger ${buttonClassName}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="nav-dropdown-label">{label}</span>
        <span className="nav-dropdown-caret" aria-hidden>{open ? '\u25B2' : '\u25BC'}</span>
      </button>
      {menuNode}
    </div>
  );
}
