import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { AccountMenu } from '../src/AccountMenu';

it('keeps initials as the only account control and exposes logout after click', () => {
  const logout = vi.fn();
  render(<AccountMenu name="Alice Lee" initials="AL" color="#1e40af" language="en" onLogout={logout} />);
  const avatar = screen.getByRole('button', { name: 'Account: Alice Lee' });
  expect(avatar).toHaveTextContent('AL');
  expect(avatar).toHaveStyle({ backgroundColor: '#1e40af' });
  expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument();
  fireEvent.click(avatar);
  expect(avatar).toHaveAttribute('aria-expanded', 'true');
  const item = screen.getByRole('menuitem', { name: 'Log out' });
  expect(item).toHaveFocus();
  fireEvent.click(item);
  expect(logout).toHaveBeenCalledOnce();
});

it('opens with right click and Escape restores avatar focus', () => {
  render(<AccountMenu name="Alice" initials="AL" language="en" onLogout={vi.fn()} />);
  const avatar = screen.getByTestId('account-avatar');
  fireEvent.contextMenu(avatar);
  const item = screen.getByRole('menuitem', { name: 'Log out' });
  expect(item).toHaveFocus();
  fireEvent.keyDown(item, { key: 'Escape' });
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  expect(avatar).toHaveFocus();
});

it('supports keyboard context menu and menu navigation without trapping Tab', () => {
  render(<><AccountMenu name="Alice" initials="AL" language="en" onLogout={vi.fn()} /><button>Next</button></>);
  const avatar = screen.getByTestId('account-avatar');
  fireEvent.keyDown(avatar, { key: 'F10', shiftKey: true });
  const item = screen.getByRole('menuitem', { name: 'Log out' });
  for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End']) {
    fireEvent.keyDown(item, { key });
    expect(item).toHaveFocus();
  }
  fireEvent.keyDown(item, { key: 'Tab' });
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});

it('dismisses on outside pointer/focus and toggles on repeated clicks', () => {
  render(<><AccountMenu name="Alice" initials="AL" language="en" onLogout={vi.fn()} /><button>Outside</button></>);
  const avatar = screen.getByTestId('account-avatar');
  fireEvent.click(avatar);
  fireEvent.click(avatar);
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  fireEvent.click(avatar);
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Outside' }));
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  fireEvent.keyDown(avatar, { key: 'ArrowDown' });
  screen.getByRole('button', { name: 'Outside' }).focus();
  fireEvent.focusIn(screen.getByRole('button', { name: 'Outside' }));
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});

it('uses Polish account and logout labels and safe missing-initials fallback', () => {
  render(<AccountMenu language="pl" onLogout={vi.fn()} />);
  const avatar = screen.getByRole('button', { name: 'Konto' });
  expect(avatar).toHaveTextContent('UU');
  fireEvent.keyDown(avatar, { key: 'ContextMenu' });
  expect(screen.getByRole('menuitem', { name: 'Wyloguj' })).toBeVisible();
});
