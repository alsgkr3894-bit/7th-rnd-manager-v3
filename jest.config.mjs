/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/__tests__/**/*.test.mjs'],
  // 이 폴더 안에 만든 다른 작업 폴더(.claude/worktrees)의 테스트는 실행하지 않는다 — 그 테스트가
  // 여기 소스를 읽어 엉뚱하게 실패한다. <rootDir> 기준이라 그 작업 폴더에서 실행할 때는 영향이 없다.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/.claude/'],
  setupFiles: ['<rootDir>/__tests__/setup/xlsx-node-fs.mjs'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};

export default config;
