import { useEffect, useId, useRef, useState } from 'react';
import type { Language } from './content';

interface Props { name?: string; initials?: string; color?: string; language: Language; onLogout: () => void }

export function AccountMenu({ name, initials, color, language, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const avatar = useRef<HTMLButtonElement>(null);
  const item = useRef<HTMLButtonElement>(null);
  const id = useId();
  const label = language === 'pl' ? 'Konto' : 'Account';
  const close = () => { setOpen(false); avatar.current?.focus(); };
  useEffect(() => {
    if (!open) return;
    item.current?.focus();
    const dismissOutside = (event: Event) => {
      if (event.target instanceof Node && !wrapper.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('focusin', dismissOutside);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('focusin', dismissOutside);
    };
  }, [open]);
  return <div ref={wrapper} className="account-menu">
    <button ref={avatar} type="button" data-testid="account-avatar" className="account-avatar"
      aria-label={name ? label + ': ' + name : label} aria-haspopup="menu" aria-expanded={open}
      aria-controls={open ? id : undefined} style={{ backgroundColor: color }}
      onClick={() => { setOpen(value => !value); }}
      onContextMenu={event => { event.preventDefault(); setOpen(true); }}
      onKeyDown={event => {
        if (['ArrowDown', 'ArrowUp', 'ContextMenu'].includes(event.key) || (event.key === 'F10' && event.shiftKey)) {
          event.preventDefault(); setOpen(true);
        }
      }}>{initials ?? 'UU'}</button>
    {open && <div id={id} role="menu" tabIndex={-1} aria-label={label} className="account-menu-popup"
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); close(); }
        if (event.key === 'Tab') close();
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
          const current = items.findIndex(control => control === document.activeElement);
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
            : (current + (event.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length;
          items[next]?.focus();
        }
      }}>
      <a role="menuitem" href={language === 'pl' ? '/pl/settings/' : '/settings/'}>{language === 'pl' ? 'Ustawienia' : 'Settings'}</a>
      <button ref={item} type="button" role="menuitem" onClick={() => { close(); onLogout(); }}>
        {language === 'pl' ? 'Wyloguj' : 'Log out'}
      </button>
    </div>}
  </div>;
}
