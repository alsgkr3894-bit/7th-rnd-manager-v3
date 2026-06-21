import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';

const source = readFileSync(resolve('app/settings/brands/useBrandActions.jsx'), 'utf8');

describe('brand restore preview guards', () => {
  test('브랜드 복원은 백업 출처/대상 확인 후 ConfirmDialog로 진행한다', () => {
    expect(source).not.toContain('window.confirm');
    expect(source).toContain('backupSourceMetadataOf');
    expect(source).toContain('isBackupSourceMismatch');
    expect(source).toContain('showConfirm');
    expect(source).toContain('덮어쓰기 복원');
    expect(source).toContain('summary.failedStores');
    expect(source).toContain('불완전 백업 위험 승인');
    expect(source).toContain('누락 감수하고 복원');
    expect(source).toContain('checkFileSize(file, UPLOAD_MAX_MB.backup)');
  });

  test('브랜드 복원은 공유 store 보호 skip을 실제 오류와 분리한다', () => {
    expect(source).toContain("const SHARED_SKIP_STORE = '__shared_skipped__'");
    expect(source).toContain('realErrors');
    expect(source).toContain('sharedSkip');
    expect(source).toContain('공유 store는 7번가 보호로 건너뜀');
  });
});
