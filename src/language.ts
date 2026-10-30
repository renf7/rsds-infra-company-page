import { useEffect } from 'react';
import { replaceLocation } from './browser';
import type { Language } from './content';

const preferenceKey = 'rsd-language-preference';
const countryKey = 'rsd-detected-country';
type StorageName = 'localStorage' | 'sessionStorage';

function readStorage(name: StorageName, key: string): string | null {
  try { return window[name].getItem(key); }
  catch { return null; }
}
function writeStorage(name: StorageName, key: string, value: string): void {
  try { window[name].setItem(key, value); }
  catch { /* Language navigation remains usable when storage is blocked. */ }
}
export function rememberLanguage(language: Language): void {
  writeStorage('localStorage', preferenceKey, language);
}
async function detectCountry(signal: AbortSignal): Promise<unknown> {
  const response = await fetch('https://api.country.is/', {
    cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal,
  });
  if (!response.ok) throw new Error(`Country lookup failed: ${response.status}`);
  const body: unknown = await response.json();
  return body;
}

export function useLanguageRedirect(language: Language): void {
  useEffect(() => {
    if (language !== 'en' || !['/', '/index.html'].includes(window.location.pathname)) return;
    const redirect = () => { replaceLocation(`/pl/${window.location.search}${window.location.hash}`); };
    const preference = readStorage('localStorage', preferenceKey);
    if (preference === 'pl') { redirect(); return; }
    if (preference === 'en') return;
    const cachedCountry = readStorage('sessionStorage', countryKey);
    if (cachedCountry) {
      if (cachedCountry === 'PL') redirect();
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => { controller.abort(); }, 2000);
    void detectCountry(controller.signal).then(body => {
      if (controller.signal.aborted || typeof body !== 'object' || body === null || !('country' in body) || typeof body.country !== 'string') return;
      const country = body.country.toUpperCase();
      writeStorage('sessionStorage', countryKey, country);
      if (country === 'PL' && readStorage('localStorage', preferenceKey) !== 'en') redirect();
    }).catch(() => { /* English is the fallback on network/country errors. */ }).finally(() => { window.clearTimeout(timer); });
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [language]);
}
