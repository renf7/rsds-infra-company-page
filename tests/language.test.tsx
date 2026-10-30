import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { replaceLocation } from '../src/browser';

vi.mock('../src/browser', () => ({ replaceLocation: vi.fn() }));
const countryFetch = vi.fn<typeof fetch>();
beforeEach(() => {
  vi.mocked(replaceLocation).mockClear();
  countryFetch.mockReset().mockResolvedValue(Response.json({ country: 'US' }));
  vi.stubGlobal('fetch', countryFetch);
});
function openPage(path = '/') {
  history.replaceState(null, '', path);
  return render(<App language={path.startsWith('/pl/') ? 'pl' : 'en'} />);
}

describe('existing language behavior after React hydration', () => {
  for (const language of ['en', 'pl'] as const) {
    it(`remembers an explicit ${language} choice`, () => {
      localStorage.setItem('rsd-language-preference', 'en');
      openPage();
      const link = screen.getByRole('link', { name: language.toUpperCase() });
      link.addEventListener('click', event => { event.preventDefault(); }, { once: true });
      fireEvent.click(link);
      expect(localStorage.getItem('rsd-language-preference')).toBe(language);
    });
  }
  it('redirects a saved Polish preference and preserves query/hash', () => {
    localStorage.setItem('rsd-language-preference', 'pl');
    openPage('/index.html?source=bookmark#team');
    expect(replaceLocation).toHaveBeenCalledWith('/pl/?source=bookmark#team');
    expect(countryFetch).not.toHaveBeenCalled();
  });
  it('honors saved English without a country request', () => {
    localStorage.setItem('rsd-language-preference', 'en'); openPage();
    expect(countryFetch).not.toHaveBeenCalled(); expect(replaceLocation).not.toHaveBeenCalled();
  });
  it('leaves direct Polish URLs alone', () => {
    openPage('/pl/'); expect(countryFetch).not.toHaveBeenCalled(); expect(replaceLocation).not.toHaveBeenCalled();
  });
  it('uses cached Polish country without a request', () => {
    sessionStorage.setItem('rsd-detected-country', 'PL'); openPage();
    expect(replaceLocation).toHaveBeenCalledWith('/pl/'); expect(countryFetch).not.toHaveBeenCalled();
  });
  it('uses cached US country without a request', () => {
    sessionStorage.setItem('rsd-detected-country', 'US'); openPage();
    expect(countryFetch).not.toHaveBeenCalled(); expect(replaceLocation).not.toHaveBeenCalled();
  });
  it('normalizes/caches the country and redirects Polish visitors', async () => {
    countryFetch.mockResolvedValue(Response.json({ country: 'pl' })); openPage('/?source=e2e#services');
    await waitFor(() => { expect(replaceLocation).toHaveBeenCalledWith('/pl/?source=e2e#services'); });
    expect(sessionStorage.getItem('rsd-detected-country')).toBe('PL');
    expect(countryFetch).toHaveBeenCalledWith('https://api.country.is/', expect.objectContaining({ credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' }));
  });
  it('caches a non-Polish country without redirecting', async () => {
    openPage(); await waitFor(() => { expect(sessionStorage.getItem('rsd-detected-country')).toBe('US'); });
    expect(replaceLocation).not.toHaveBeenCalled();
  });
  for (const response of [null, {}, { country: 42 }]) {
    it(`keeps English for invalid country response ${JSON.stringify(response)}`, async () => {
      countryFetch.mockResolvedValue(Response.json(response)); openPage();
      await waitFor(() => { expect(countryFetch).toHaveBeenCalledOnce(); });
      expect(replaceLocation).not.toHaveBeenCalled(); expect(sessionStorage.getItem('rsd-detected-country')).toBeNull();
    });
  }
  it('keeps English if the country service returns HTTP 503', async () => {
    countryFetch.mockResolvedValue(new Response('', { status: 503 })); openPage();
    await waitFor(() => { expect(countryFetch).toHaveBeenCalledOnce(); }); expect(replaceLocation).not.toHaveBeenCalled();
  });
  it('keeps English if the network rejects', async () => {
    countryFetch.mockRejectedValue(new Error('offline')); openPage();
    await waitFor(() => { expect(countryFetch).toHaveBeenCalledOnce(); }); expect(replaceLocation).not.toHaveBeenCalled();
  });
  it('continues when storage access is denied', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('denied'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('denied'); });
    openPage(); await waitFor(() => { expect(countryFetch).toHaveBeenCalledOnce(); });
    const link = screen.getByRole('link', { name: 'PL' });
    link.addEventListener('click', event => { event.preventDefault(); }, { once: true });
    expect(() => fireEvent.click(link)).not.toThrow();
  });
  it('aborts country lookup after two seconds and on unmount', () => {
    vi.useFakeTimers(); countryFetch.mockImplementation(() => new Promise(() => { /* pending network */ }));
    const view = openPage(); const options = countryFetch.mock.calls[0]?.[1];
    vi.advanceTimersByTime(2000); expect(options?.signal?.aborted).toBe(true);
    view.unmount(); vi.useRealTimers();
  });
});
