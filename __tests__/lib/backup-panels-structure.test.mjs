import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';

const src = f => readFileSync(resolve(f), 'utf8');

// 백업 화면 패널은 한 파일에 7개 컴포넌트(559줄)가 몰려 있었다 — 패널 하나당 한 파일로
// 나누고, 기존 import 경로(_BackupPagePanels)는 배럴로 유지한다.
describe('백업 화면 패널 파일 분리', () => {
  test('_BackupPagePanels는 구현 없이 re-export만 한다', () => {
    const hub = src('app/settings/backup/_BackupPagePanels.jsx');
    expect(hub).not.toContain('export function');
    expect(hub).toContain(
      "export { BackupBrandBanner, BackupReminderBanner } from './panels/BackupBanners'"
    );
    expect(hub).toContain("from './panels/ServerBackupStatusCard'");
    expect(hub).toContain("from './panels/BackupHistoryCard'");
    expect(hub.split('\n').length).toBeLessThanOrEqual(30);
  });

  test('패널 파일은 각자 한 책임만 갖고 200줄을 넘지 않는다', () => {
    const panels = [
      'app/settings/backup/panels/BackupBanners.jsx',
      'app/settings/backup/panels/BackupSummaryTiles.jsx',
      'app/settings/backup/panels/ServerBackupStatusCard.jsx',
      'app/settings/backup/panels/BackupProgressBar.jsx',
      'app/settings/backup/panels/BackupScopeCard.jsx',
      'app/settings/backup/panels/BackupHistoryCard.jsx',
      'app/settings/backup/panels/BackupDiagnosticsCard.jsx',
    ];
    for (const file of panels) {
      expect(src(file).split('\n').length).toBeLessThanOrEqual(200);
    }
  });

  test('공용 스타일·포맷터는 backupPanelShared에 모여 있다', () => {
    const shared = src('app/settings/backup/panels/backupPanelShared.js');
    expect(shared).toContain('export const S_ALERT_WRAP');
    expect(shared).toContain('export const S_HISTORY_EMPTY');
    expect(shared).toContain('export function formatBytes');
    expect(shared).toContain('export function formatBackupStatus');
    expect(shared).toContain('export function importStatusLabel');
    // 스타일 상수를 패널 파일이 각자 복제하지 않는다.
    expect(src('app/settings/backup/panels/ServerBackupStatusCard.jsx')).toContain(
      "from './backupPanelShared'"
    );
    expect(src('app/settings/backup/panels/BackupHistoryCard.jsx')).toContain(
      "from './backupPanelShared'"
    );
  });
});
