import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import globals from 'globals';

export default defineConfig([
  ...nextVitals,
  {
    files: ['**/*.{js,jsx,mjs,ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    linterOptions: { reportUnusedDisableDirectives: false },
    rules: {
      'no-undef': 'error',
      '@next/next/no-img-element': 'off',
      '@next/next/no-html-link-for-pages': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
      '@next/next/no-location-assign-relative-destination': 'off',
    },
  },
  {
    files: ['__tests__/**/*.{js,mjs}'],
    languageOptions: { globals: globals.jest },
  },
  globalIgnores([
    '.next*/**',
    'coverage/**',
    'node_modules/**',
    '.qa-tmp/**',
    '.db-backups/**',
    '.pgdata/**',
    '.postgresql/**',
  ]),
]);
