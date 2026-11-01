import { useState } from 'react';
import { emailAction, type EmailChallenge } from './auth-api';
import type { Language } from './content';
export function EmailVerificationForm({ language, initial, verified }: { language: Language; initial: EmailChallenge; verified: () => void }) {
  const [challenge, setChallenge] = useState(initial);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const polish = language === 'pl';
  const submit = () => {
    setBusy(true); setError('');
    const enteringEmail = challenge.needsEmail;
    void emailAction(enteringEmail ? 'email-code' : 'verify-email', enteringEmail ? { email: value } : { code: value }).then(() => {
      setValue('');
      if (enteringEmail) setChallenge({ needsEmail: false, maskedEmail: '' });
      else verified();
    }).catch(() => { setError(polish ? 'Nieprawidłowy lub wygasły kod. Spróbuj ponownie lub rozpocznij logowanie od nowa.' : 'Invalid or expired code. Try again or start sign-in again.'); })
      .finally(() => { setBusy(false); });
  };
  return <form onSubmit={event => { event.preventDefault(); submit(); }}>
    <p>{challenge.needsEmail
      ? (polish ? 'Dostawca nie udostępnił adresu email. Podaj adres, aby potwierdzić własność konta.' : 'Your provider did not share an email. Enter an address to verify account ownership.')
      : (polish ? 'Wpisz kod wysłany na email. Kod wygasa po 10 minutach.' : 'Enter the code sent to your email. It expires in 10 minutes.')}</p>
    {challenge.maskedEmail && <p>{challenge.maskedEmail}</p>}
    <label htmlFor="auth-verification">{challenge.needsEmail ? 'Email' : (polish ? 'Kod weryfikacyjny' : 'Verification code')}</label>
    <input id="auth-verification" className="auth-input" type={challenge.needsEmail ? 'email' : 'text'}
      autoComplete={challenge.needsEmail ? 'email' : 'one-time-code'} inputMode={challenge.needsEmail ? 'email' : 'numeric'}
      maxLength={challenge.needsEmail ? 254 : 6} pattern={challenge.needsEmail ? undefined : '[0-9]{6}'}
      required value={value} onChange={event => { setValue(event.target.value); }} />
    {error && <p role="alert">{error}</p>}
    <button className="btn btn-primary" type="submit" disabled={busy}>{challenge.needsEmail ? (polish ? 'Wyślij kod' : 'Send code') : (polish ? 'Potwierdź i kontynuuj' : 'Verify and continue')}</button>
  </form>;
}
