import { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { activity, beginNavigation, endNavigation } from './activity';
import type { Language } from './content';

export function ActivityIndicator({ language }: { language: Language }) {
  const busy = useSyncExternalStore(activity.subscribe, activity.snapshot, activity.serverSnapshot);
  useEffect(() => {
    const navigate = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(link instanceof HTMLAnchorElement) || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
      const target = new URL(link.href, window.location.href);
      const current = new URL(window.location.href);
      if (!['http:', 'https:'].includes(target.protocol)) return;
      if (target.origin === current.origin && target.pathname === current.pathname && target.search === current.search) return;
      beginNavigation();
    };
    document.addEventListener('click', navigate);
    window.addEventListener('pageshow', endNavigation);
    window.addEventListener('pagehide', endNavigation);
    return () => {
      document.removeEventListener('click', navigate);
      window.removeEventListener('pageshow', endNavigation);
      window.removeEventListener('pagehide', endNavigation);
      endNavigation();
    };
  }, []);
  if (!busy || typeof document === 'undefined') return null;
  // A native modal is in the top layer: render inside it so feedback stays visible.
  return createPortal(<div className="activity-indicator" role="status" aria-live="polite" data-testid="activity-indicator">
    <span className="activity-spinner" aria-hidden="true" />
    <span>{language === 'pl' ? 'Proszę czekać…' : 'Please wait…'}</span>
  </div>, document.querySelector('dialog[open]') ?? document.body);
}
