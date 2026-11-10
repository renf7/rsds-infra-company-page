import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { prerender } from '../scripts/prerender';
import { readPrivacyPolicy } from '../scripts/privacy-policy';

const directories: string[] = [];
afterEach(async () => {
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true });
});
async function outputDirectory() {
  const directory = await mkdtemp(join(tmpdir(), 'rsds-prerender-'));
  directories.push(directory);
  await mkdir(join(directory, 'pl'));
  return directory;
}

it('pre-renders complete localized pages while preserving their SEO metadata', async () => {
  const directory = await outputDirectory();
  for (const page of ['index.html', 'pl/index.html']) await writeFile(join(directory, page), await readFile(resolve(page)));
  await prerender(directory);
  for (const [language, page] of [['en', 'index.html'], ['pl', 'pl/index.html']]) {
    const document = new DOMParser().parseFromString(await readFile(join(directory, page), 'utf8'), 'text/html');
    const expected = new DOMParser().parseFromString(await readFile(resolve(`tests/fixtures/static/${language}.html`), 'utf8'), 'text/html');
    expect(document.documentElement.lang).toBe(language);
    expect(document.querySelector('h1')?.textContent).toBe(expected.querySelector('h1')?.textContent);
    expect(document.title).toBe(expected.title);
    for (const selector of ['link[rel="canonical"]', 'meta[name="description"]', 'meta[property="og:locale"]']) {
      expect(document.querySelector(selector)?.outerHTML).toBe(expected.querySelector(selector)?.outerHTML);
    }
    expect(document.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(expected.querySelectorAll('script[type="application/ld+json"]').length);
    const settings = new DOMParser().parseFromString(await readFile(join(directory, language === 'en' ? 'settings/index.html' : 'pl/settings/index.html'), 'utf8'), 'text/html');
    expect(settings.querySelector('h1')?.textContent).toBe(language === 'en' ? 'Settings' : 'Ustawienia');
    expect(settings.querySelector('.brand-logo')?.getAttribute('src')).toBe('/logo-icon.png');
  }
});
it('fails rather than publishing an empty or unexpected prerender shell', async () => {
  const directory = await outputDirectory();
  await writeFile(join(directory, 'index.html'), '<html><body>missing shell</body></html>');
  await expect(prerender(directory)).rejects.toThrow('Missing prerender shell');
});
it('publishes a complete English static policy without scripts, tracking or unresolved fields', async () => {
  const directory = await outputDirectory();
  for (const page of ['index.html', 'pl/index.html']) await writeFile(join(directory, page), await readFile(resolve(page)));
  await writeFile(join(directory, 'privacy-policy.html'), 'retired policy artifact');
  await prerender(directory);
  await expect(readFile(join(directory, 'privacy-policy.html'))).rejects.toThrow();
  const document = new DOMParser().parseFromString(await readFile(join(directory, 'facebook-privacy-policy.html'), 'utf8'), 'text/html');
  expect(document.title).toBe('Privacy Policy | RSD Software EU');
  expect(document.documentElement.lang).toBe('en');
  expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://www.rsdsoftware.eu/facebook-privacy-policy');
  expect(document.querySelectorAll('script, iframe, form')).toHaveLength(0);
  expect(document.querySelectorAll('section')).toHaveLength(10);
  expect(document.body.textContent).not.toMatch(/Awaiting owner verification|Local review draft|\[insert/i);
});
it('does not expose a policy or footer link when verification is incomplete', async () => {
  const directory = await outputDirectory();
  for (const page of ['index.html', 'pl/index.html']) await writeFile(join(directory, page), await readFile(resolve(page)));
  await writeFile(join(directory, 'facebook-privacy-policy.html'), 'stale previously approved document');
  await prerender(directory, { ...readPrivacyPolicy(), status: 'draft', controllerAddress: '', publicationDate: '' }, false);
  await expect(readFile(join(directory, 'facebook-privacy-policy.html'))).rejects.toThrow();
  expect(await readFile(join(directory, 'index.html'), 'utf8')).not.toContain('data-privacy-policy-link');
});
