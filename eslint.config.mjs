import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

const sourceFiles = ['**/*.{js,jsx,ts,tsx}'];

export default [
  { ignores: ['node_modules/**', 'dist/**', 'coverage/**', '.scannerwork/**', '.local*/**', '.validation/**'] },
  { ...js.configs.recommended, files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'] },
  {
    files: sourceFiles,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
    },
  },
  ...tseslint.configs.recommendedTypeChecked.map(config => ({
    ...config,
    files: ['**/*.{ts,tsx}'],
  })),
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  { files: ['**/*.{mjs,cjs}', '*config.js'], languageOptions: { globals: globals.node } },
  { files: ['scripts/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}', 'vite.config.ts'], languageOptions: { globals: globals.node } },
];
