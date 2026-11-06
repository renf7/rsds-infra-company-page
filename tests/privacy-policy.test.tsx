import { renderToString } from 'react-dom/server';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { PrivacyPolicyPage } from '../src/PrivacyPolicyPage';
import { App } from '../src/App';
import { parsePrivacyPolicy, policyIsAvailable, readPrivacyPolicy, requireApprovedPolicy } from '../scripts/privacy-policy';

const draftPolicy = () => ({ ...readPrivacyPolicy(), status: 'draft', controllerAddress: '', publicationDate: '' });

it('keeps the incomplete owner-reviewed policy out of normal publication', () => {
  const draft = draftPolicy();
  expect(draft.status).toBe('draft');
  expect(policyIsAvailable(draft, false)).toBe(false);
  expect(policyIsAvailable(draft, true)).toBe(true);
  expect(() => requireApprovedPolicy(draft)).toThrow('owner verification');
  expect(renderToString(<App language="en" />)).not.toContain('data-privacy-policy-link');
  render(<App language="en" privacyPolicyAvailable />);
  expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/facebook-privacy-policy');
});
it('makes the draft scope and missing facts explicit without login', () => {
  render(<PrivacyPolicyPage policy={draftPolicy()} />);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Privacy Policy');
  expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(10);
  expect(screen.getByRole('note')).toHaveTextContent('Local review draft');
  expect(screen.getByText(/^This Privacy Policy concerns/)).toHaveTextContent('integration has not been implemented or activated');
  expect(screen.getByText(/Awaiting owner verification: business contact address/)).toBeVisible();
  expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/facebook-privacy-policy');
  expect(screen.getByRole('link', { name: 'RSD Software EU' })).toHaveAttribute('href', 'https://www.facebook.com/profile.php?id=61596025359717');
  expect(screen.getAllByRole('link', { name: 'contact@rsdsoftware.eu' }).length).toBeGreaterThan(0);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('requires complete verified facts and a valid publication date before release', () => {
  const complete = { ...readPrivacyPolicy(), status: 'approved', controllerAddress: 'Example address for test only', publicationDate: '2026-11-05', verificationReference: 'Test fixture only: complete owner verification record' };
  expect(() => requireApprovedPolicy(complete)).not.toThrow();
  expect(policyIsAvailable(complete, false)).toBe(true);
  expect(renderToString(<PrivacyPolicyPage policy={complete} />)).not.toContain('Local review draft');
  expect(() => requireApprovedPolicy({ ...complete, controllerAddress: '[insert address]' })).toThrow('Unresolved');
  expect(() => requireApprovedPolicy({ ...complete, storageAndRetention: '' })).toThrow('Unresolved');
  expect(() => requireApprovedPolicy({ ...complete, publicationDate: '2026-02-31' })).toThrow('publication date');
  expect(parsePrivacyPolicy(complete)).toEqual(complete);
  expect(() => parsePrivacyPolicy(null)).toThrow('Invalid privacy-policy');
  expect(() => parsePrivacyPolicy({ status: 'draft' })).toThrow('Invalid privacy-policy field');
  expect(() => parsePrivacyPolicy({ ...complete, status: 'other' })).toThrow('Unknown');
});

it('describes the owner-operated AI workflow without claiming local-only processing', () => {
  const html = renderToString(<PrivacyPolicyPage policy={readPrivacyPolicy()} />);
  expect(html).toContain('RSD Software EU');
  expect(html).not.toContain('(API access)');
  expect(html).toContain('Posts will be written manually');
  expect(html).toContain('stored locally');
  expect(html).toContain('Conversation history');
  expect(html).toContain('does not by itself mean');
  expect(html).toContain('not active yet');
});
