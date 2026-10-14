// ESLint (flat config) for the whole workspace: `npm run lint`.
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'backend/.pgdata/**', 'backend/uploads/**', 'frontend/test-results/**'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      'no-console': 'off',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
    },
  },

  // API, scripts and tests run on Node.
  {
    files: ['backend/**/*.ts', 'frontend/tests/**/*.mjs', 'frontend/*.{js,ts}', '*.mjs'],
    languageOptions: { globals: globals.node },
  },

  // Storefront and admin run in the browser.
  {
    files: ['frontend/src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // Code passed to page.evaluate() in the browser tests runs inside the page.
  {
    files: ['frontend/tests/**/*.mjs'],
    languageOptions: { globals: { ...globals.node, window: 'readonly', document: 'readonly', location: 'readonly', getComputedStyle: 'readonly' } },
  },
);
