import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const executePanel = readFileSync(
  resolve('components/settings/restore/RestoreExecutePanel.jsx'),
  'utf8'
);
const autoBackupOption = readFileSync(
  resolve('components/settings/restore/RestoreAutoBackupOption.jsx'),
  'utf8'
);
const confirmSummary = readFileSync(
  resolve('components/settings/restore/RestoreConfirmSummary.jsx'),
  'utf8'
);
const backupFailurePrompt = readFileSync(
  resolve('components/settings/restore/RestoreBackupFailurePrompt.jsx'),
  'utf8'
);
const executeActions = readFileSync(
  resolve('components/settings/restore/RestoreExecuteActions.jsx'),
  'utf8'
);
const progressBar = readFileSync(
  resolve('components/settings/restore/RestoreProgressBar.jsx'),
  'utf8'
);
const moduleChip = readFileSync(
  resolve('components/settings/restore/RestoreModuleChip.jsx'),
  'utf8'
);
const scopePanel = readFileSync(
  resolve('components/settings/restore/RestoreScopePanel.jsx'),
  'utf8'
);
const doneCard = readFileSync(resolve('components/settings/restore/RestoreDoneCard.jsx'), 'utf8');

describe('restore execute panel structure', () => {
  test('RestoreExecutePanel delegates section rendering to focused components', () => {
    expect(executePanel).toContain('<RestoreAutoBackupOption');
    expect(executePanel).toContain('<RestoreConfirmSummary');
    expect(executePanel).toContain('<RestoreBackupFailurePrompt');
    expect(executePanel).toContain('<RestoreExecuteActions');
    expect(executePanel).toContain('<RestoreProgressBar');
    expect(executePanel).toContain('restoreBlockedByFailedStores');
    expect(executePanel).not.toContain('formatNumber');
    expect(executePanel).not.toContain('MODULE_GROUPS');
    expect(executePanel).not.toContain('type="checkbox"');
    expect(executePanel).not.toContain('width: `${Math.max');
  });

  test('split restore execute components own their focused responsibilities', () => {
    expect(autoBackupOption).toContain('export function RestoreAutoBackupOption');
    expect(autoBackupOption).toContain('<Toggle');
    expect(autoBackupOption).toContain('복원 직전 자동 백업');

    expect(confirmSummary).toContain('export function RestoreConfirmSummary');
    expect(confirmSummary).toContain('<RestoreModuleChip');
    expect(confirmSummary).toContain('type="checkbox"');
    expect(confirmSummary).toContain('백업 생성 당시 읽기 실패 store');
    expect(confirmSummary).toContain('데이터가 줄어드는 store');

    expect(backupFailurePrompt).toContain('export function RestoreBackupFailurePrompt');
    expect(backupFailurePrompt).toContain('백업 없이 복원');

    expect(executeActions).toContain('export function RestoreExecuteActions');
    expect(executeActions).toContain('restoreBlockedByFailedStores');
    expect(executeActions).toContain('복원 실행');

    expect(progressBar).toContain('export function RestoreProgressBar');
    expect(progressBar).toContain('export function restoreProgressPercent');
    expect(progressBar).toContain('formatNumber(Math.min');
  });

  test('module chip styling is shared by restore scope and done panels', () => {
    expect(moduleChip).toContain('export function RestoreModuleChip');
    expect(moduleChip).toContain('MODULE_GROUPS');
    expect(moduleChip).toContain('restoreModuleChipStyle');
    expect(scopePanel).toContain('<RestoreModuleChip');
    expect(doneCard).toContain('<RestoreModuleChip');
    expect(scopePanel).not.toContain('const chipStyle');
    expect(doneCard).not.toContain('const chipStyle');
  });
});
