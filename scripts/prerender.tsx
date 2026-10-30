import { readFile, writeFile } from 'node:fs/promises';
import { renderToString } from 'react-dom/server';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { App } from '../src/App';

export async function prerender(directory: string): Promise<void> {
  for (const language of ['en', 'pl'] as const) {
    const path = join(directory, language === 'en' ? 'index.html' : 'pl/index.html');
    const template = await readFile(path, 'utf8');
    const shell = '<div id="root"></div>';
    if (!template.includes(shell)) throw new Error(`Missing prerender shell in ${path}`);
    await writeFile(path, template.replace(shell, `<div id="root">${renderToString(<App language={language} />)}</div>`));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await prerender('dist');
