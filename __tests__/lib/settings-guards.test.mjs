import { afterEach, describe, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  getSetting,
  setSetting,
  SETTING_KEYS,
  SETTING_LS_KEYS,
  settingStorageKey,
} from '../../lib/settings.js';

const originalLocalStorage = globalThis.localStorage;
const settingsAuthSrc = readFileSync(resolve('hooks/useSettingsAuth.js'), 'utf8');
const systemPageSrc = readFileSync(resolve('app/settings/system/page.jsx'), 'utf8');

afterEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: originalLocalStorage,
  });
});

function installStorage(initial = {}) {
  const store = { ...initial };
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: key => store[key] ?? null,
      setItem: (key, value) => {
        store[key] = value;
      },
    },
  });
  return store;
}

describe('settings guards', () => {
  test('깨진 저장값은 설정 기본값으로 복구한다', () => {
    installStorage({
      'v3:theme': 'neon',
      'v3:density': 'huge',
      'v3:roundMode': 'random',
    });

    expect(getSetting('theme')).toBe('light');
    expect(getSetting('density')).toBe('normal');
    expect(getSetting('roundMode')).toBe('round');
  });

  test('setSetting은 허용되지 않은 값을 저장하지 않는다', () => {
    const store = installStorage();

    setSetting('fontScale', 'massive');
    setSetting('unmatchedAlert', 'maybe');

    expect(store['v3:fontScale']).toBe('normal');
    expect(store['v3:unmatchedAlert']).toBe('on');
  });

  test('백업용 localStorage key 목록은 설정 key와 1:1로 맞는다', () => {
    expect(SETTING_LS_KEYS).toEqual(SETTING_KEYS.map(key => settingStorageKey(key)));
    expect(SETTING_LS_KEYS).toEqual(
      expect.arrayContaining(['v3:density', 'v3:fontScale', 'v3:keyboardShortcuts', 'v3:roundMode'])
    );
  });

  test('시스템 설정에서 단축키 토글과 기능 목록을 보여준다', () => {
    expect(getSetting('keyboardShortcuts')).toBe('on');
    expect(systemPageSrc).toContain("'keyboardShortcuts'");
    expect(systemPageSrc).toContain('키보드 단축키 사용');
    expect(systemPageSrc).toContain('SHORTCUTS.map');
    expect(systemPageSrc).toContain('관리자 권한 필요');
  });

  test('saved-views는 active-brand의 실제 공개 API를 import한다', () => {
    const source = readFileSync(resolve('lib/saved-views.js'), 'utf8');

    expect(source).toContain("import { getActiveBrandId } from '@/lib/active-brand'");
    expect(source).not.toContain('import { activeBrandId }');
  });

  test('계정 전환은 active account 저장 실패를 성공처럼 표시하지 않는다', () => {
    const source = readFileSync(resolve('app/settings/account/page.jsx'), 'utf8');

    expect(source).toContain('const saved = setActiveAccountId(acc.id)');
    expect(source).toContain('계정 전환 실패');
    expect(source).not.toContain('setActiveAccountId(acc.id);\\n    setActiveId(acc.id);');
  });

  test('설정 PIN 세션 저장소가 막히면 인증 성공처럼 처리하지 않는다', () => {
    expect(settingsAuthSrc).toMatch(/function readAuth\(\) \{[\s\S]*catch \{\s*return false;/);
    expect(settingsAuthSrc).toContain('if (!readAuth()) return false;');
  });

  test('시스템 DB 재생성 reload 타이머는 unmount 시 정리한다', () => {
    expect(systemPageSrc).toContain('reloadTimerRef');
    expect(systemPageSrc).toContain(
      'useEffect(() => () => clearTimeout(reloadTimerRef.current), [])'
    );
    expect(systemPageSrc).toContain('function scheduleReload(delayMs)');
    expect(systemPageSrc).toContain('scheduleReload(1000)');
  });
});
