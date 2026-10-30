import { useEffect, useRef, useState } from 'react';
import { action, providers, providerNames, providerLabels, session, type AvailableProvider, type Session } from './auth-api';
import type { Language } from './content';

export function AuthControls({ language }: { language: Language }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [identity, setIdentity] = useState<Session>({ authenticated: false });
  const [available, setAvailable] = useState<readonly AvailableProvider[]>([]);
  const [error, setError] = useState('');
  const polish = language === 'pl';
  useEffect(() => {
    const modal = dialog.current;
    if (!modal) return;
    const keepFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const controls = modal.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)');
      const first = controls.item(0);
      const last = controls.item(controls.length - 1);
      if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      }
    };
    modal.addEventListener('keydown', keepFocus);
    return () => { modal.removeEventListener('keydown', keepFocus); };
  }, []);
  useEffect(() => {
    let active = true;
    void session().then(value => {
      if (!active) return;
      setIdentity(value);
      if (new URLSearchParams(window.location.search).get('login') === 'failed') setError(polish ? 'Logowanie nie powiodło się. Spróbuj ponownie.' : 'Sign-in failed. Please try again.');
    }).catch(() => { /* Logged-out UI remains available. */ });
    return () => { active = false; };
  }, [polish]);
  const open = () => {
    setError('');
    dialog.current?.showModal();
    void providers().then(setAvailable).catch(() => { setError(polish ? 'Logowanie jest chwilowo niedostępne.' : 'Sign-in is temporarily unavailable.'); });
  };
  const close = () => { dialog.current?.close(); button.current?.focus(); };
  const logout = () => {
    void action('logout').then(() => { setIdentity({ authenticated: false }); setError(''); })
      .catch(() => { setError(polish ? 'Wylogowanie nie powiodło się.' : 'Logout failed. Please try again.'); });
  };
  return <div className="auth-controls" data-auth-ui="true">
    {identity.authenticated
      ? <button type="button" className="auth-button" title={identity.name} aria-label={polish ? 'Wyloguj' : 'Log out'} onClick={logout}><span aria-hidden="true">↪</span><span className="auth-button-label">{polish ? 'Wyloguj' : 'Log out'}</span></button>
      : <button ref={button} type="button" className="auth-button" aria-label={polish ? 'Zaloguj się' : 'Log in'} onClick={open}>
        <span aria-hidden="true">↪</span><span className="auth-button-label">{polish ? 'Zaloguj się' : 'Log in'}</span>
      </button>}
    {error && <p className="auth-error" role="alert">{error}</p>}
    <dialog ref={dialog} className="auth-dialog" aria-labelledby="auth-heading">
      <h2 id="auth-heading">{polish ? 'Zaloguj się' : 'Log in'}</h2>
      <p>{polish ? 'Wybierz dostawcę konta. Hasło podajesz tylko u dostawcy.' : 'Choose your account provider. Enter your password only with that provider.'}</p>
      <div className="auth-provider-list">{providerNames.map(provider => {
        const enabled = available.some(item => item.id === provider && item.enabled);
        const label = providerLabels[provider];
        return enabled ? <a className="btn btn-secondary" key={provider} href={'/api/auth/oauth2/authorization/' + provider + (polish ? '?lang=pl' : '')}>{label}</a>
          : <button className="btn btn-secondary" type="button" key={provider} disabled>{label}</button>;
      })}</div>
      {error && <p role="alert">{error}</p>}
      <button type="button" className="auth-button" onClick={close}>{polish ? 'Zamknij' : 'Close'}</button>
    </dialog>
  </div>;
}

