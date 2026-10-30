import { expect, it, vi } from 'vitest';
import { action, providers, session } from '../src/auth-api';
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
