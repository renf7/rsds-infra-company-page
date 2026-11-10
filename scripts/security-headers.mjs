// Hash generated JSON-LD exactly as served; never permit arbitrary inline scripts.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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
inspect('dist');
const policy = `default-src 'self'; script-src 'self' ${[...hashes].sort().join(' ')}; style-src 'self'; img-src 'self' data:; connect-src 'self' https://api.country.is; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`;
writeFileSync('security-headers.conf', [
  'add_header X-Frame-Options "DENY" always;',
  'add_header X-Content-Type-Options "nosniff" always;',
  'add_header Referrer-Policy "strict-origin-when-cross-origin" always;',
  `add_header Content-Security-Policy "${policy}" always;`,
  '',
].join('\n'));
