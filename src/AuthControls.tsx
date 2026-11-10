import { useEffect, useRef, useState } from 'react';
import { action, providers, providerNames, providerLabels, session, type AvailableProvider, type Session } from './auth-api';
import { AccountMenu } from './AccountMenu';
import { ProviderIcon } from './ProviderIcon';
import type { Language } from './content';
import { beginNavigation, runAction } from './activity';

export function AuthControls({ language }: { language: Language }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [identity, setIdentity] = useState<Session>({ authenticated: false });
  const [available, setAvailable] = useState<readonly AvailableProvider[]>([]);
  const [error, setError] = useState('');
  const [opened, setOpened] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const polish = language === 'pl';
  const shown = providerNames.filter(provider => available.some(item => item.id === provider && item.enabled && item.visible !== false));
  useEffect(() => {
    if (!opened) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try {
        const next = await providers();
        if (active) { setAvailable(next); setError(''); }
      } catch {
        if (active) { setAvailable([]); setError(polish ? 'Logowanie jest chwilowo niedostępne.' : 'Sign-in is temporarily unavailable.'); }
      } finally {
        if (active) { setLoaded(true); timer = setTimeout(() => { void refresh(); }, 5000); }
      }
    };
    void runAction(refresh);
    return () => { active = false; clearTimeout(timer); };
  }, [opened, polish]);
  useEffect(() => {
    const modal = dialog.current;
    if (!modal) return;
    const keepFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const controls = modal.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled)');
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
    void runAction(session).then(value => {
      if (!active) return;
      setIdentity(value);
      if (new URLSearchParams(window.location.search).get('login') === 'failed') setError(polish ? 'Logowanie nie powiodło się. Spróbuj ponownie.' : 'Sign-in failed. Please try again.');
    }).catch(() => { /* Logged-out UI remains available. */ });
    return () => { active = false; };
  }, [polish]);
  const open = () => {
    setError('');
    setAvailable([]); setLoaded(false); setOpened(true);
    dialog.current?.showModal();
  };
  const close = () => { setOpened(false); dialog.current?.close(); button.current?.focus(); };
  const logout = () => {
    void runAction(() => action('logout')).then(() => {
      setIdentity({ authenticated: false }); setError('');
      beginNavigation(); window.location.replace(polish ? '/pl/' : '/');
    })
      .catch(() => { setError(polish ? 'Wylogowanie nie powiodło się.' : 'Logout failed. Please try again.'); });
  };
  return <div className="auth-controls" data-auth-ui="true">
    {identity.authenticated
      ? <AccountMenu name={identity.name} initials={identity.initials} color={identity.avatarColor} language={language} onLogout={logout} />
      : <button ref={button} type="button" className="auth-button" aria-label={polish ? 'Zaloguj się' : 'Log in'} onClick={open}>
        <span aria-hidden="true">↪</span><span className="auth-button-label">{polish ? 'Zaloguj się' : 'Log in'}</span>
      </button>}
    {error && <p className="auth-error" role="alert">{error}</p>}
    <dialog ref={dialog} className="auth-dialog" aria-labelledby="auth-heading" aria-describedby="auth-description" onClose={() => { setOpened(false); }} onCancel={() => { setOpened(false); }}>
      <h2 id="auth-heading">{polish ? 'Zaloguj się' : 'Log in'}</h2>
      <p id="auth-description" className="auth-description">{polish ? 'Wybierz dostawcę, aby kontynuować.' : 'Choose a provider to continue.'}</p>
      <div className="auth-provider-list">{shown.map(provider => {
        const label = providerLabels[provider];
        const text = (polish ? 'Kontynuuj z ' : 'Continue with ') + label;
        return <a className="btn btn-secondary" key={provider} href={'/api/auth/oauth2/authorization/' + provider + (polish ? '?lang=pl' : '')}><ProviderIcon provider={provider} /><span>{text}</span></a>;
      })}</div>
      {loaded && !error && shown.length === 0 && <p role="status">{polish ? 'Brak dostępnych metod logowania. Spróbuj później.' : 'No sign-in methods are available. Please try again later.'}</p>}
      {error && <p role="alert">{error}</p>}
      <p className="auth-footnote">{polish ? 'Przy pierwszym logowaniu utworzymy Twoje konto.' : 'We’ll create your account on your first sign-in.'}</p>
      <button type="button" className="auth-dialog-close" aria-label={polish ? 'Zamknij' : 'Close'} onClick={close}><span aria-hidden="true">×</span></button>
    </dialog>
  </div>;
}

