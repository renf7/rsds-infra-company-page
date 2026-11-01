import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { EmailVerificationForm } from '../src/EmailVerificationForm';
import { emailAction } from '../src/auth-api';
vi.mock('../src/auth-api', () => ({ emailAction: vi.fn() }));
beforeEach(() => { vi.mocked(emailAction).mockResolvedValue(); });
it('verifies the emailed code before completing account creation', async () => {
  const verified = vi.fn();
  render(<EmailVerificationForm language="en" initial={{ needsEmail: false, maskedEmail: 'a***@example.test' }} verified={verified} />);
  expect(screen.getByText('a***@example.test')).toBeVisible();
  fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify and continue' }));
  await waitFor(() => { expect(emailAction).toHaveBeenCalledWith('verify-email', { code: '123456' }); expect(verified).toHaveBeenCalledOnce(); });
});
it('requests an email only when the provider did not supply one', async () => {
  render(<EmailVerificationForm language="pl" initial={{ needsEmail: true, maskedEmail: '' }} verified={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'alice@example.test' } });
  fireEvent.click(screen.getByRole('button', { name: 'Wyślij kod' }));
  await waitFor(() => { expect(emailAction).toHaveBeenCalledWith('email-code', { email: 'alice@example.test' }); });
  expect(await screen.findByLabelText('Kod weryfikacyjny')).toHaveValue('');
});
it('keeps failed or expired verification in the form without signing in', async () => {
  vi.mocked(emailAction).mockRejectedValue(new Error('invalid'));
  const verified = vi.fn();
  render(<EmailVerificationForm language="en" initial={{ needsEmail: false, maskedEmail: '' }} verified={verified} />);
  fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '000000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify and continue' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid or expired code'); expect(verified).not.toHaveBeenCalled();
});
