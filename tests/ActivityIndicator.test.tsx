import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { ActivityIndicator } from '../src/ActivityIndicator';
import { endNavigation, runAction } from '../src/activity';

afterEach(endNavigation);
it('keeps feedback until all overlapping actions finish, including rejected requests', async () => {
  render(<ActivityIndicator language="en" />);
  let finish!: () => void;
  let fail!: (reason: Error) => void;
  let first!: Promise<void>;
  let second!: Promise<void>;
  act(() => {
    first = runAction(() => new Promise<void>(resolve => { finish = resolve; }));
    second = runAction(() => new Promise<void>((_resolve, reject) => { fail = reject; })).catch(() => undefined);
  });
  expect(screen.getByRole('status')).toHaveTextContent('Please wait');
  await act(async () => { finish(); await first; });
  expect(screen.getByRole('status')).toBeVisible();
  await act(async () => { fail(new Error('offline')); await second; });
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
it('clears feedback after a synchronous action error', async () => {
  render(<ActivityIndicator language="en" />);
  await act(async () => { await expect(runAction(() => { throw new Error('failed'); })).rejects.toThrow('failed'); });
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
it('shows provider navigation feedback inside the modal and clears it on browser restore', () => {
  const preventNavigation = (event: MouseEvent) => { event.preventDefault(); };
  window.addEventListener('click', preventNavigation);
  render(<><ActivityIndicator language="pl" /><dialog open><a href="/api/auth/oauth2/authorization/microsoft">Continue with Microsoft</a></dialog></>);
  fireEvent.click(screen.getByRole('link'));
  expect(screen.getByRole('status')).toHaveTextContent('Proszę czekać');
  expect(screen.getByRole('dialog')).toContainElement(screen.getByRole('status'));
  fireEvent(window, new Event('pageshow'));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  window.removeEventListener('click', preventNavigation);
});
it('ignores instant controls, section anchors and links opening another tab', () => {
  render(<><ActivityIndicator language="en" /><button>Menu</button><a href="#contact">Contact</a><a href="/settings/" target="_blank">Settings</a></>);
  fireEvent.click(screen.getByRole('button'));
  fireEvent.click(screen.getByText('Contact'));
  fireEvent.click(screen.getByText('Settings'));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
