import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { SettingsPage } from '../src/SettingsPage';
import * as api from '../src/auth-api';
vi.mock('../src/auth-api', async original => ({ ...await original<typeof api>(), session: vi.fn(), accountSettings: vi.fn(), saveContactEmail: vi.fn() }));
it('uses a full page with an optional email and persists without a verification modal', async () => {
  vi.mocked(api.session).mockResolvedValue({ authenticated: true });
  vi.mocked(api.accountSettings).mockResolvedValue({ email: '', emailVerified: false });
  vi.mocked(api.saveContactEmail).mockResolvedValue();
  render(<SettingsPage language="en" />);
  expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  const email = await screen.findByLabelText('Email (optional)');
  expect(email).not.toBeRequired();
  fireEvent.change(email, { target: { value: 'contact@example.test' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Saved');
  expect(api.saveContactEmail).toHaveBeenCalledWith('contact@example.test');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('asks an anonymous visitor to sign in instead of showing personal settings', async () => {
  vi.mocked(api.session).mockResolvedValue({ authenticated: false });
  render(<SettingsPage language="pl" />);
  expect(await screen.findByText('Zaloguj się, aby otworzyć ustawienia.')).toBeVisible();
  expect(screen.queryByLabelText('Email (opcjonalny)')).not.toBeInTheDocument();
});
it('shows an actionable save failure in Polish without discarding the entered address', async () => {
  vi.mocked(api.session).mockResolvedValue({ authenticated: true });
  vi.mocked(api.accountSettings).mockResolvedValue({ email: '', emailVerified: false });
  vi.mocked(api.saveContactEmail).mockRejectedValue(new Error('expired session'));
  render(<SettingsPage language="pl" />);
  const email = await screen.findByLabelText('Email (opcjonalny)');
  fireEvent.change(email, { target: { value: 'contact@example.test' } });
  fireEvent.click(screen.getByRole('button', { name: 'Zapisz zmiany' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się zapisać');
  expect(email).toHaveValue('contact@example.test');
});
it('reports a settings load failure without showing an editable form', async () => {
  vi.mocked(api.session).mockRejectedValue(new Error('offline'));
  render(<SettingsPage language="en" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load settings');
  expect(screen.queryByLabelText('Email (optional)')).not.toBeInTheDocument();
});
