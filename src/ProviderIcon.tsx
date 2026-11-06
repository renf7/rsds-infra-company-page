import type { Provider } from './auth-api';

export function ProviderIcon({ provider }: { provider: Provider }) {
  return <span className={`provider-badge provider-badge--${provider}`} aria-hidden="true">
    <img src={`/provider-icons/${provider}.svg`} alt="" aria-hidden="true" width="20" height="20" />
  </span>;
}
