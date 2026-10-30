import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToString } from 'react-dom/server';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../src/App';

function signature(element: Element): unknown {
  return {
    tag: element.tagName,
    attributes: [...element.attributes].map(a => `${a.name}=${a.value}`).sort(),
    text: [...element.childNodes].filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => (node.textContent ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean),
    children: [...element.children].filter(child => !child.hasAttribute('data-auth-ui')).map(signature),
  };
}

describe('React migration preserves the static site', () => {
  for (const language of ['en', 'pl'] as const) {
    it(`preserves every content element, attribute and normalized text for ${language}`, () => {
      const baseline = new DOMParser().parseFromString(readFileSync(resolve('tests/fixtures/static', `${language}.html`), 'utf8'), 'text/html');
      const migrated = new DOMParser().parseFromString(renderToString(<App language={language} />), 'text/html');
      for (const selector of ['header', 'main', 'footer']) {
        const actual = migrated.querySelector(selector);
        const expected = baseline.querySelector(selector);
        expect(actual).not.toBeNull();
        expect(expected).not.toBeNull();
        expect(signature(actual!)).toEqual(signature(expected!));
      }
    });

    it(`renders accessible language and contact links for ${language}`, () => {
      render(<App language={language} />);
      expect(screen.getByRole('link', { name: 'EN' })).toHaveAttribute('href', '/');
      expect(screen.getByRole('link', { name: 'PL' })).toHaveAttribute('href', '/pl/');
      expect(screen.getByRole('link', { name: 'contact@rsdsoftware.eu' })).toHaveAttribute('href', 'mailto:contact@rsdsoftware.eu');
      expect(screen.getByRole('heading', { level: 1 })).toBeVisible();
    });
  }
});
