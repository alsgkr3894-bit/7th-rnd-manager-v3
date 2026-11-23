/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/__tests__/**/*.test.mjs'],
  setupFiles: ['<rootDir>/__tests__/setup/xlsx-node-fs.mjs'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};

export default config;
