import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const systemSettingsSource = readFileSync(resolve('app/settings/system/page.jsx'), 'utf8');
const settingsSource = readFileSync(resolve('lib/settings.js'), 'utf8');

describe('system policy settings usage guards', () => {
  test('원가 정책 설정 화면은 실제 동작 없는 토글을 조작 가능하게 노출하지 않는다', () => {
    expect(systemSettingsSource).toContain('단가 변경 시 원가 화면 자동 반영');
    expect(systemSettingsSource).toContain('항상 자동 반영');
    expect(systemSettingsSource).toContain('미연동 재료 차단');
    expect(systemSettingsSource).toContain('준비 중');
    expect(systemSettingsSource).toContain('1자리 반올림');
    expect(systemSettingsSource).not.toContain("updateSetting('autoRecalc'");
    expect(systemSettingsSource).not.toContain("updateSetting('strictPosting'");
    expect(systemSettingsSource).not.toContain("updateSetting('roundMode'");
  });

  test('백업 호환용 원가 정책 key는 설정 registry에 남긴다', () => {
    expect(settingsSource).toContain('autoRecalc');
    expect(settingsSource).toContain('strictPosting');
    expect(settingsSource).toContain('roundMode');
    expect(settingsSource).toContain('백업 호환용 key');
  });
});
