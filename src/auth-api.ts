export interface Session { authenticated: boolean; name?: string; email?: string; roles?: readonly string[]; initials?: string; avatarColor?: string }
export const providerNames = ['facebook', 'microsoft', 'google', 'apple', 'github'] as const;
export type Provider = typeof providerNames[number];
export const providerLabels: Record<Provider, string> = { facebook: 'Facebook', microsoft: 'Microsoft', google: 'Google', apple: 'Apple', github: 'GitHub' };
export interface AvailableProvider { id: Provider; enabled: boolean }
export interface EmailChallenge { needsEmail: boolean; maskedEmail: string }
export async function emailChallenge(): Promise<EmailChallenge> {
  const response = await fetch('/api/auth/email-verification', { credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) throw new Error('Sign in again');
  return await response.json() as EmailChallenge;
}
export async function emailAction(name: 'email-code' | 'verify-email', data: { email: string } | { code: string }): Promise<void> {
  await post(name, data);
}
export async function session(): Promise<Session> {
  let response = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' });
  if (response.status === 401) {
    await action('refresh');
    response = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' });
  }
  if (!response.ok) return { authenticated: false };
  return await response.json() as Session;
}
export async function providers(): Promise<readonly AvailableProvider[]> {
  const response = await fetch('/api/auth/providers', { credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) throw new Error('Sign-in is temporarily unavailable');
  return await response.json() as readonly AvailableProvider[];
}
export async function action(name: 'logout' | 'refresh'): Promise<void> {
  await post(name);
}
async function post(name: string, data?: { email: string } | { code: string }): Promise<void> {
  const csrf = await fetch('/api/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
  if (!csrf.ok) throw new Error('Session request failed');
  const body = await csrf.json() as { token: string };
  const response = await fetch('/api/auth/' + name, { method: 'POST', credentials: 'same-origin', headers: { 'X-XSRF-TOKEN': body.token, ...(data ? { 'Content-Type': 'application/json' } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) });
  if (!response.ok) throw new Error('Session request failed');
}

