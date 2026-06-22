import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';

const restorePage = readFileSync(resolve('app/settings/restore/page.jsx'), 'utf8');
const restoreFileHook = readFileSync(resolve('hooks/useRestoreFile.js'), 'utf8');
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
const executeActions = readFileSync(
  resolve('components/settings/restore/RestoreExecuteActions.jsx'),
  'utf8'
);

describe('restore failedStores guard', () => {
  test('전체 복원은 failedStores 백업을 별도 위험 승인 전까지 차단한다', () => {
    // failedStores 파싱·toast 노출은 useRestoreFile 훅에서 처리
    expect(restoreFileHook).toContain('summary.failedStores');
    expect(restoreFileHook).toContain('UPLOAD_EXT');
    expect(restoreFileHook).toContain('checkFileExt(file, UPLOAD_EXT.json)');
    expect(restoreFileHook.indexOf('checkFileExt(file, UPLOAD_EXT.json)')).toBeLessThan(
      restoreFileHook.indexOf('checkFileSize(file, UPLOAD_MAX_MB.backup)')
    );
    expect(restoreFileHook).toContain('readFileAsText(file, UPLOAD_EXT.json)');
    expect(restorePage).toContain('allowFailedStoreRestore');
    expect(restorePage).toContain('위험 승인 체크가 필요합니다');
    expect(restorePage).toContain('setBackupFailed(false)');
    expect(executePanel).toContain('restoreBlockedByFailedStores');
    expect(confirmSummary).toContain('백업 생성 당시 읽기 실패 store');
    expect(confirmSummary).toContain('type="checkbox"');
    expect(scopePanel).toContain('별도 위험 승인이 필요합니다');
  });

  test('전체 복원 UI와 핸들러는 admin 권한 확인 전까지 잠긴다', () => {
    expect(restorePage).toContain("from '@/hooks/useCurrentRole'");
    expect(restorePage).toContain('const canRestore = roleReady && isAdmin');
    expect(restorePage).toContain('if (!canRestore)');
    expect(restorePage).toContain("roleReady ? '관리자 권한이 필요합니다' : '권한 확인 중입니다'");
    expect(restorePage).toContain('disabled={busy || !canRestore}');
    expect(restorePage).toContain('canRestore={canRestore}');
    expect(executePanel).toContain('canRestore = false');
    expect(executeActions).toContain('canRestore = false');
    expect(executeActions).toContain('!canRestore');
  });
});
