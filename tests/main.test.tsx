import { beforeEach, expect, it, vi } from 'vitest';
import { createRoot, hydrateRoot } from 'react-dom/client';

vi.mock('react-dom/client', () => ({ createRoot: vi.fn(() => ({ render: vi.fn() })), hydrateRoot: vi.fn() }));
vi.mock('../src/App', () => ({ App: () => null }));
beforeEach(() => {
  vi.resetModules();
  vi.mocked(createRoot).mockClear(); vi.mocked(hydrateRoot).mockClear();
  document.body.innerHTML = '<div id="root"></div>';
});
it('hydrates pre-rendered content without replacing it', async () => {
  document.documentElement.lang = 'pl';
  document.getElementById('root')!.innerHTML = '<main>existing server content</main>';
  await import('../src/main');
  expect(hydrateRoot).toHaveBeenCalledOnce(); expect(createRoot).not.toHaveBeenCalled();
});
it('renders the development shell when no prerendered content exists', async () => {
  document.documentElement.lang = 'en'; await import('../src/main');
  expect(createRoot).toHaveBeenCalledOnce(); expect(hydrateRoot).not.toHaveBeenCalled();
});
it('fails clearly for an invalid entry document', async () => {
  document.body.innerHTML = ''; await expect(import('../src/main')).rejects.toThrow('Missing React root');
});
