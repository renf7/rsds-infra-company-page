import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { policyIsAvailable, readPrivacyPolicy } from './scripts/privacy-policy';

export default defineConfig({
  define: { 'import.meta.env.VITE_PRIVACY_POLICY_AVAILABLE': JSON.stringify(String(policyIsAvailable(readPrivacyPolicy(), process.env.PRIVACY_POLICY_PREVIEW === 'true'))) },
  plugins: [react()],
  build: {
    rolldownOptions: {
      input: {
        en: fileURLToPath(new URL('./index.html', import.meta.url)),
        pl: fileURLToPath(new URL('./pl/index.html', import.meta.url)),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'scripts/**/*.{ts,tsx,mjs}'],
      reporter: ['text', 'lcov'],
      thresholds: { lines: 80, statements: 80, branches: 80, functions: 80 },
    },
  },
});
