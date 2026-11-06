import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { AuthControls } from '../src/AuthControls';
import * as api from '../src/auth-api';
vi.mock('../src/auth-api', async original => ({ ...await original<typeof api>(), session: vi.fn(), providers: vi.fn(), action: vi.fn(), emailChallenge: vi.fn(), emailAction: vi.fn() }));
beforeEach(() => {
  history.replaceState(null, '', '/');
  vi.mocked(api.session).mockResolvedValue({ authenticated: false });
  vi.mocked(api.providers).mockResolvedValue(api.providerNames.map(id => ({ id, enabled: true })));
  vi.mocked(api.action).mockResolvedValue();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
it('shows the saved account initials and permanent colour after login', async () => {
  vi.mocked(api.session).mockResolvedValue({ authenticated: true, name: 'Alice Lee', initials: 'AL', avatarColor: '#1e40af' });
  render(<AuthControls language="en" />);
  const avatar = await screen.findByTestId('account-avatar');
  expect(avatar).toHaveTextContent('AL');
  expect(avatar).toHaveStyle({ backgroundColor: '#1e40af' });
  expect(avatar).toHaveAccessibleName('Account: Alice Lee');
  expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument();
  fireEvent.click(avatar);
  expect(screen.getByRole('menuitem', { name: 'Log out' })).toBeVisible();
});
it('opens an accessible modal with backend-managed provider links and restores focus', async () => {
  render(<AuthControls language="en" />);
  const button = screen.getByRole('button', { name: 'Log in' });
  fireEvent.click(button);
  expect(screen.getByRole('dialog')).toHaveAccessibleName('Log in');
  for (const provider of api.providerNames) {
    expect(await screen.findByRole('link', { name: "Continue with " + api.providerLabels[provider] })).toHaveAttribute('href', '/api/auth/oauth2/authorization/' + provider);
  }
  const first = screen.getByRole('link', { name: 'Continue with Facebook' });
  const close = screen.getByRole('button', { name: 'Close' });
  close.focus();
  fireEvent.keyDown(close, { key: 'Tab' });
  expect(first).toHaveFocus();
  fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
  expect(close).toHaveFocus();
  fireEvent.keyDown(close, { key: 'ArrowRight' });
  expect(close).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(button).toHaveFocus();
});
it.each([['en', '/'], ['pl', '/pl/']] as const)('logs out from settings and replaces the page with the %s home', async (language, home) => {
  history.replaceState(null, '', language === 'pl' ? '/pl/settings/' : '/settings/');
  const replace = vi.fn();
  vi.stubGlobal('location', { ...window.location, replace });
  vi.mocked(api.session).mockResolvedValue({ authenticated: true, name: 'Alice', roles: [] });
  render(<AuthControls language={language} />);
  fireEvent.click(await screen.findByTestId('account-avatar'));
  fireEvent.click(screen.getByRole('menuitem', { name: language === 'pl' ? 'Wyloguj' : 'Log out' }));
  await waitFor(() => { expect(api.action).toHaveBeenCalledWith('logout'); });
  await waitFor(() => { expect(replace).toHaveBeenCalledWith(home); });
});
it('does not navigate away when logout fails', async () => {
  const replace = vi.fn();
  vi.stubGlobal('location', { ...window.location, replace });
  vi.mocked(api.action).mockRejectedValueOnce(new Error('offline'));
  vi.mocked(api.session).mockResolvedValue({ authenticated: true, name: 'Alice' });
  render(<AuthControls language="en" />);
  fireEvent.click(await screen.findByTestId('account-avatar'));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Log out' }));
  expect(await screen.findByText('Logout failed. Please try again.', { selector: '.auth-error' })).toBeVisible();
  expect(replace).not.toHaveBeenCalled();
});
it('provides Polish labels and does not enable unavailable providers', async () => {
  vi.mocked(api.providers).mockResolvedValue([]);
  render(<AuthControls language="pl" />);
  fireEvent.click(screen.getByRole('button', { name: 'Zaloguj się' }));
  await waitFor(() => { expect(api.providers).toHaveBeenCalledOnce(); });
  expect(screen.getByRole('button', { name: 'Kontynuuj z Google' })).toBeDisabled();
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
it('never opens an internal email challenge, including a stale verification URL', async () => {
  history.replaceState(null, '', '/?login=verify');
  vi.mocked(api.session).mockResolvedValue({ authenticated: true, name: 'Alice', initials: 'AL' });
  render(<AuthControls language="en" />);
  expect(await screen.findByTestId('account-avatar')).toBeVisible();
  expect(screen.queryByLabelText('Verification code')).not.toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(api.emailChallenge).not.toHaveBeenCalled();
});
