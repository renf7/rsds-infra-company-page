import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { AuthControls } from '../src/AuthControls';
import * as api from '../src/auth-api';
vi.mock('../src/auth-api', async original => ({ ...await original<typeof api>(), session: vi.fn(), providers: vi.fn(), action: vi.fn() }));
beforeEach(() => {
  vi.mocked(api.session).mockResolvedValue({ authenticated: false });
  vi.mocked(api.providers).mockResolvedValue(api.providerNames.map(id => ({ id, enabled: true })));
  vi.mocked(api.action).mockResolvedValue();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
it('opens an accessible modal with backend-managed provider links and restores focus', async () => {
  render(<AuthControls language="en" />);
  const button = screen.getByRole('button', { name: 'Log in' });
  fireEvent.click(button);
  expect(screen.getByRole('dialog')).toHaveAccessibleName('Log in');
  for (const provider of api.providerNames) {
    expect(await screen.findByRole('link', { name: api.providerLabels[provider] })).toHaveAttribute('href', '/api/auth/oauth2/authorization/' + provider);
  }
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(button).toHaveFocus();
});
it('renders the authenticated session and logs out through the CSRF-aware API', async () => {
  vi.mocked(api.session).mockResolvedValue({ authenticated: true, name: 'Alice', roles: [] });
  render(<AuthControls language="en" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Log out' }));
  await waitFor(() => { expect(api.action).toHaveBeenCalledWith('logout'); });
  expect(await screen.findByRole('button', { name: 'Log in' })).toBeVisible();
});
it('provides Polish labels and does not enable unavailable providers', async () => {
  vi.mocked(api.providers).mockResolvedValue([]);
  render(<AuthControls language="pl" />);
  fireEvent.click(screen.getByRole('button', { name: 'Zaloguj się' }));
  await waitFor(() => { expect(api.providers).toHaveBeenCalledOnce(); });
  expect(screen.getByRole('button', { name: 'Google' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Zamknij' })).toBeVisible();
});
it('shows a safe actionable provider failure without token details', async () => {
  history.replaceState(null, '', '/?login=failed');
  render(<AuthControls language="en" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Sign-in failed');
});
it('keeps the page usable when session lookup or provider availability fails', async () => {
  vi.mocked(api.session).mockRejectedValue(new Error('offline'));
  vi.mocked(api.providers).mockRejectedValue(new Error('offline'));
  render(<AuthControls language="en" />);
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
  expect(await screen.findByText('Sign-in is temporarily unavailable.', { selector: '.auth-error' })).toBeInTheDocument();
});
