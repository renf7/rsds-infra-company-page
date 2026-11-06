import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { endNavigation } from '../src/activity';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(Response.json({ country: 'US' }))));
});

afterEach(() => {
  cleanup();
  endNavigation();
  localStorage.clear();
  sessionStorage.clear();
  history.replaceState(null, '', '/');
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
