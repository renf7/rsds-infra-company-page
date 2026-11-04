import { expect, it, vi } from 'vitest';
import { action, emailAction, emailChallenge, providers, session } from '../src/auth-api';
it('uses same-origin cookies and returns the backend session without storing JWTs', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ authenticated: true, roles: [] }));
  vi.stubGlobal('fetch', fetcher);
  expect((await session()).authenticated).toBe(true);
  expect(fetcher).toHaveBeenCalledWith('/api/auth/session', expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' }));
  expect(localStorage.length).toBe(0);
});
it('performs a CSRF-protected refresh before retrying an expired session', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('', { status: 401 }))
    .mockResolvedValueOnce(Response.json({ token: 'csrf-value' })).mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(Response.json({ authenticated: true }));
  vi.stubGlobal('fetch', fetcher);
  expect((await session()).authenticated).toBe(true);
  expect(fetcher).toHaveBeenCalledWith('/api/auth/refresh', expect.objectContaining({ method: 'POST', headers: { 'X-XSRF-TOKEN': 'csrf-value' } }));
});
it('recovers a missing access cookie when the backend reports an available refresh cookie', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ authenticated: false, refreshAvailable: true }))
    .mockResolvedValueOnce(Response.json({ token: 'csrf' })).mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(Response.json({ authenticated: true, initials: 'AL' }));
  vi.stubGlobal('fetch', fetcher);
  expect((await session()).authenticated).toBe(true);
  expect(fetcher).toHaveBeenCalledTimes(4);
});
it('does not attempt refresh for a visitor with no refresh cookie', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ authenticated: false, refreshAvailable: false }));
  vi.stubGlobal('fetch', fetcher);
  expect((await session()).authenticated).toBe(false);
  expect(fetcher).toHaveBeenCalledOnce();
});
it('stops after one rejected refresh instead of inventing authentication', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ authenticated: false, refreshAvailable: true }))
    .mockResolvedValueOnce(Response.json({ token: 'csrf' })).mockResolvedValueOnce(new Response('', { status: 401 }));
  vi.stubGlobal('fetch', fetcher);
  expect((await session()).authenticated).toBe(false);
  expect(fetcher).toHaveBeenCalledTimes(3);
});
it('does not invent authentication when the backend rejects the request', async () => {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 503 })));
  expect(await session()).toEqual({ authenticated: false });
  await expect(providers()).rejects.toThrow('unavailable');
  await expect(action('logout')).rejects.toThrow('Session request failed');
});
it('reports failed state-changing requests', async () => {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ token: 'csrf' })).mockResolvedValueOnce(new Response('', { status: 403 })));
  await expect(action('logout')).rejects.toThrow('Session request failed');
});
it('loads the bound email challenge and sends the code with CSRF and same-origin cookies', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ needsEmail: false, maskedEmail: 'a***@example.test' }))
    .mockResolvedValueOnce(Response.json({ token: 'csrf' })).mockResolvedValueOnce(new Response(null, { status: 204 }));
  vi.stubGlobal('fetch', fetcher);
  expect((await emailChallenge()).needsEmail).toBe(false);
  await emailAction('verify-email', { code: '123456' });
  expect(fetcher).toHaveBeenCalledWith('/api/auth/verify-email', expect.objectContaining({ credentials: 'same-origin', method: 'POST', body: JSON.stringify({ code: '123456' }), headers: { 'X-XSRF-TOKEN': 'csrf', 'Content-Type': 'application/json' } }));
});
it('rejects an expired pending login challenge', async () => {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 401 })));
  await expect(emailChallenge()).rejects.toThrow('Sign in again');
});
it('loads protected contact settings and saves optional email with CSRF using PUT', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ email: '', emailVerified: false }))
    .mockResolvedValueOnce(Response.json({ token: 'csrf' })).mockResolvedValueOnce(new Response(null, { status: 204 }));
  vi.stubGlobal('fetch', fetcher);
  const api = await import('../src/auth-api');
  expect((await api.accountSettings()).email).toBe('');
  await api.saveContactEmail('contact@example.test');
  expect(fetcher).toHaveBeenCalledWith('/api/auth/settings', expect.objectContaining({ method: 'PUT', credentials: 'same-origin', headers: { 'X-XSRF-TOKEN': 'csrf', 'Content-Type': 'application/json' } }));
});
it('rejects inaccessible account settings', async () => {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 401 })));
  const api = await import('../src/auth-api');
  await expect(api.accountSettings()).rejects.toThrow('Settings unavailable');
});
it('shares an in-flight refresh between header and settings session lookups', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ authenticated: false, refreshAvailable: true }))
    .mockResolvedValueOnce(Response.json({ token: 'csrf' })).mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(Response.json({ authenticated: true }));
  vi.stubGlobal('fetch', fetcher);
  const result = await Promise.all([session(), session()]);
  expect(result.every(value => value.authenticated)).toBe(true);
  expect(fetcher).toHaveBeenCalledTimes(4);
});
