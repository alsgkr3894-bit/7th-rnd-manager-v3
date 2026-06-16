import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';

const restorePage = readFileSync(resolve('app/settings/restore/page.jsx'), 'utf8');
const executePanel = readFileSync(
  resolve('components/settings/restore/RestoreExecutePanel.jsx'),
  'utf8'
);
const confirmSummary = readFileSync(
  resolve('components/settings/restore/RestoreConfirmSummary.jsx'),
  'utf8'
);
const scopePanel = readFileSync(
  resolve('components/settings/restore/RestoreScopePanel.jsx'),
  'utf8'
);

describe('restore failedStores guard', () => {
  test('전체 복원은 failedStores 백업을 별도 위험 승인 전까지 차단한다', () => {
    expect(restorePage).toContain('summary.failedStores');
    expect(restorePage).toContain('allowFailedStoreRestore');
    expect(restorePage).toContain('위험 승인 체크가 필요합니다');
    expect(executePanel).toContain('restoreBlockedByFailedStores');
    expect(confirmSummary).toContain('백업 생성 당시 읽기 실패 store');
    expect(confirmSummary).toContain('type="checkbox"');
    expect(scopePanel).toContain('별도 위험 승인이 필요합니다');
  });
});
