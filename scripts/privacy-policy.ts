import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { PrivacyPolicy } from '../src/PrivacyPolicyPage';
const fields = ['status', 'publicationDate', 'controllerName', 'controllerAddress', 'storageAndRetention', 'serviceProviders', 'securityMeasures', 'internationalProcessing', 'verificationReference'] as const;

export function readPrivacyPolicy(): PrivacyPolicy {
  const value: unknown = JSON.parse(readFileSync(resolve('docs/privacy/meta-pages-policy.json'), 'utf8'));
  return parsePrivacyPolicy(value);
}

export function parsePrivacyPolicy(value: unknown): PrivacyPolicy {
  if (typeof value !== 'object' || value === null) throw new Error('Invalid privacy-policy configuration');
  const record = value as Record<string, unknown>;
  for (const field of fields) if (!(field in record) || typeof record[field] !== 'string') throw new Error('Invalid privacy-policy field: ' + field);
  const policy = value as PrivacyPolicy;
  if (!['draft', 'approved'].includes(policy.status)) throw new Error('Unknown privacy-policy review status');
  if (policy.status === 'approved') requireApprovedPolicy(policy);
  return policy;
}

export function requireApprovedPolicy(policy: PrivacyPolicy): void {
  if (policy.status !== 'approved') throw new Error('Privacy policy is a draft: owner verification is required before publication');
  for (const field of fields) {
    const value = policy[field];
    if (!value.trim() || /\[|\]|\bTODO\b|\bTBD\b|\bawaiting\b|\boutstanding\b|\bunverified\b|<insert/i.test(value)) throw new Error('Unresolved privacy-policy field: ' + field);
  }
  const timestamp = Date.parse(policy.publicationDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(policy.publicationDate) || !Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== policy.publicationDate) throw new Error('Set the actual privacy-policy publication date');
}

export function policyIsAvailable(policy: PrivacyPolicy, preview: boolean): boolean {
  return policy.status === 'approved' || preview;
}
