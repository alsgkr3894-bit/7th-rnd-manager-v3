import { afterEach, describe, expect, test } from '@jest/globals';
import { getSetting, setSetting } from '../../lib/settings.js';

const originalLocalStorage = globalThis.localStorage;

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
      setItem: (key, value) => { store[key] = value; },
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
});
