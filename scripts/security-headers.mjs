// Hash generated JSON-LD exactly as served; never permit arbitrary inline scripts.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export function generateHeaders(directory, output) {

const hashes = new Set();
function inspect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) inspect(path);
    else if (path.endsWith('.html')) {
      const html = readFileSync(path, 'utf8');
      for (const match of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
        hashes.add(`'sha256-${createHash('sha256').update(match[1]).digest('base64')}'`);
      }
    }
  }
}
inspect(directory);
const policy = `default-src 'self'; script-src 'self' ${[...hashes].sort((left, right) => left.localeCompare(right)).join(' ')}; style-src 'self'; img-src 'self' data:; connect-src 'self' https://api.country.is; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`;
writeFileSync(output, [
  'add_header X-Frame-Options "DENY" always;',
  'add_header X-Content-Type-Options "nosniff" always;',
  'add_header Referrer-Policy "strict-origin-when-cross-origin" always;',
  `add_header Content-Security-Policy "${policy}" always;`,
  '',
].join('\n'));

}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) generateHeaders('dist', 'security-headers.conf');

