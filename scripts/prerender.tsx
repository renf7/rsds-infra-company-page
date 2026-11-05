import { readFile, rm, writeFile } from 'node:fs/promises';
import { renderToString } from 'react-dom/server';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { App } from '../src/App';
import { PrivacyPolicyPage, type PrivacyPolicy } from '../src/PrivacyPolicyPage';
import { policyIsAvailable, readPrivacyPolicy, requireApprovedPolicy } from './privacy-policy';

export async function prerender(directory: string, policy: PrivacyPolicy = readPrivacyPolicy(), preview = process.env.PRIVACY_POLICY_PREVIEW === 'true'): Promise<void> {
  if (policy.status === 'approved') requireApprovedPolicy(policy);
  const available = policyIsAvailable(policy, preview);
  for (const language of ['en', 'pl'] as const) {
    const path = join(directory, language === 'en' ? 'index.html' : 'pl/index.html');
    const template = await readFile(path, 'utf8');
    const shell = '<div id="root"></div>';
    if (!template.includes(shell)) throw new Error(`Missing prerender shell in ${path}`);
    await writeFile(path, template.replace(shell, `<div id="root">${renderToString(<App language={language} privacyPolicyAvailable={available} />)}</div>`));
  }
  if (available) {
    const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Privacy Policy | RSD Software</title><meta name="description" content="Privacy information for the RSD Software EU (API access) Facebook Pages integration."><meta name="referrer" content="no-referrer"><meta name="robots" content="' + (policy.status === 'approved' ? 'index,follow' : 'noindex,nofollow') + '"><link rel="canonical" href="https://www.rsdsoftware.eu/privacy-policy"><link rel="stylesheet" href="/styles.css"></head><body>' + renderToString(<PrivacyPolicyPage policy={policy} />) + '</body></html>';
    await writeFile(join(directory, 'privacy-policy.html'), html);
  } else {
    await rm(join(directory, 'privacy-policy.html'), { force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await prerender('dist');
