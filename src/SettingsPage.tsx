import { useEffect, useState } from 'react';
import { accountSettings, saveContactEmail, session } from './auth-api';
import type { Language } from './content';

export function SettingsPage({ language }: { language: Language }) {
  const pl = language === 'pl';
  const [state, setState] = useState<'loading' | 'ready' | 'anonymous' | 'error'>('loading');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void session().then(async identity => {
      if (!identity.authenticated) { if (active) setState('anonymous'); return; }
      const value = await accountSettings();
      if (active) { setEmail(value.email); setState('ready'); }
    }).catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, []);
  const save = () => {
    setSaving(true); setMessage(''); setError('');
    void saveContactEmail(email).then(() => { setMessage(pl ? 'Zapisano zmiany.' : 'Saved changes.'); })
      .catch(() => { setError(pl ? 'Nie udało się zapisać. Sprawdź adres email lub zaloguj się ponownie.' : 'Could not save. Check the email address or sign in again.'); })
      .finally(() => { setSaving(false); });
  };
  return <main className="container settings-page">
    <a href={pl ? '/pl/' : '/'}>{pl ? 'Powrót do strony głównej' : 'Back to home'}</a>
    <h1>{pl ? 'Ustawienia' : 'Settings'}</h1>
    {state === 'loading' && <p role="status">{pl ? 'Wczytywanie…' : 'Loading…'}</p>}
    {state === 'anonymous' && <p>{pl ? 'Zaloguj się, aby otworzyć ustawienia.' : 'Sign in to open settings.'}</p>}
    {state === 'error' && <p role="alert">{pl ? 'Nie można wczytać ustawień. Spróbuj ponownie.' : 'Could not load settings. Please try again.'}</p>}
    {state === 'ready' && <form onSubmit={event => { event.preventDefault(); save(); }}>
      <section className="settings-section" aria-labelledby="contact-settings">
        <h2 id="contact-settings">{pl ? 'Dane kontaktowe' : 'Contact details'}</h2>
        <p id="email-help">{pl ? 'Email jest opcjonalny. Wpisanie adresu nie łączy kont ani nie potwierdza jego własności.' : 'Email is optional. Entering an address does not link accounts or verify ownership.'}</p>
        <label htmlFor="settings-email">{pl ? 'Email (opcjonalny)' : 'Email (optional)'}</label>
        <input id="settings-email" className="auth-input" type="email" autoComplete="email" maxLength={254} value={email} aria-describedby="email-help" onChange={event => { setEmail(event.target.value); setMessage(''); }} />
      </section>
      <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? (pl ? 'Zapisywanie…' : 'Saving…') : (pl ? 'Zapisz zmiany' : 'Save changes')}</button>
      {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
    </form>}
  </main>;
}
