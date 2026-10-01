import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    '**/dist/**',
    '**/cdn/**',
    '**/.next/**',
    '**/.nuxt/**',
    '**/.output/**',
    '**/next-env.d.ts',
    '.superpowers/**',
    'docs/**',
    'packages/tokens/neu.css',
    'packages/elements/custom-elements.json',
    'packages/react/src/generated/**',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
]);
