import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const appShellSource = readFileSync(resolve('components/AppShell.jsx'), 'utf8');
const homeSource = readFileSync(resolve('app/page.jsx'), 'utf8');

describe('settings alert gating', () => {
  test('미매칭 알림 설정은 상단 알림과 모바일 배지를 함께 제어한다', () => {
    expect(appShellSource).toContain("useSettingValue('unmatchedAlert')");
    expect(appShellSource).toContain(
      'const visibleUnmatchedCount = unmatchedAlertEnabled ? unmatchedCount : 0'
    );
    expect(appShellSource).toContain('unmatchedCount={visibleUnmatchedCount}');
    expect(appShellSource).toContain("tab.badgeKey === 'unmatched' ? visibleUnmatchedCount : 0");
  });

  test('홈 알림 위젯은 시스템 알림 설정을 따른다', () => {
    expect(homeSource).toContain("useSettingValue('unmatchedAlert')");
    expect(homeSource).toContain("useSettingValue('costRateAlert')");
    expect(homeSource).toContain('const alertIssues = unmatchedAlertEnabled ? issues : []');
    expect(homeSource).toContain('const alertCostAlertData = costRateAlertEnabled');
    expect(homeSource).toContain('const showUnmatched = unmatchedAlertEnabled');
    expect(homeSource).toContain('const showCostAlert =');
    expect(homeSource).toContain('costRateAlertEnabled && isVisible');
  });
});
