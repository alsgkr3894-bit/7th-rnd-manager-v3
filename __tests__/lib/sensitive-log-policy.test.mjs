import { readFileSync } from 'node:fs';
import { describe, expect, test } from '@jest/globals';

const SENSITIVE_FILES = [
  'app/rnd/login-info/page.jsx',
  'app/rnd/corporate-card/page.jsx',
  'app/settings/backup/page.jsx',
  'app/settings/backup/useBackupActions.js',
  'app/api/db/health/route.js',
  'app/api/db/backups/route.js',
  'app/api/db/store-rows/route.js',
];

describe('민감 기능 로그 정책', () => {
  test.each(SENSITIVE_FILES)('%s는 오류 객체 전체를 콘솔에 기록하지 않는다', file => {
    const source = readFileSync(file, 'utf8');
    expect(source).not.toMatch(/console\.(?:error|warn)\([^\n]*(?:,\s*(?:err|error|bkErr)|restoreErrors)/);
  });
});
