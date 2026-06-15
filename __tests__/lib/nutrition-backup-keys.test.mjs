import { afterEach, describe, expect, test } from '@jest/globals';
import {
  collectLocalStorage,
  persistentLocalStorageKeysForScopes,
  pickLocalStorageForScopes,
  restoreLocalStorage,
} from '../../lib/nutrition/backup-keys.js';

const originalLocalStorage = globalThis.localStorage;

afterEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: originalLocalStorage,
  });
});

function installStorage(storage) {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
}

describe('nutrition backup localStorage keys', () => {
  test('collectLocalStorage는 읽기 실패 키만 건너뛴다', () => {
    installStorage({
      getItem(key) {
        if (key === 'bad') throw new Error('blocked');
        return key === 'good' ? 'saved' : null;
      },
    });

    expect(collectLocalStorage(['good', 'bad', 'empty'])).toEqual({ good: 'saved' });
  });

  test('restoreLocalStorage는 쓰기 실패와 알 수 없는 키를 건너뛰고 성공 개수를 반환한다', () => {
    const saved = {};
    installStorage({
      setItem(key, value) {
        if (key === 'bad') throw new Error('quota');
        saved[key] = value;
      },
    });

    expect(
      restoreLocalStorage({ good: '1', bad: '2', unknown: '3', nonString: 4 }, [
        'good',
        'bad',
        'nonString',
      ])
    ).toBe(1);
    expect(saved).toEqual({ good: '1' });
  });

  test('모듈 선택에 맞는 localStorage key만 고른다', () => {
    expect(persistentLocalStorageKeysForScopes(['jette'])).toEqual(
      expect.arrayContaining(['v3:jette-settings', 'v3:home-widgets', 'v3:profile'])
    );
    expect(persistentLocalStorageKeysForScopes(['jette'])).not.toContain(
      'v3:nutrition-menu-order'
    );

    expect(
      pickLocalStorageForScopes(
        {
          'v3:jette-settings': 'jette',
          'v3:home-widgets': 'home',
          'v3:profile': 'profile',
          'v3:nutrition-menu-order': 'nutrition',
          'v3:unknown': 'unknown',
        },
        ['jette']
      )
    ).toEqual({
      'v3:jette-settings': 'jette',
      'v3:home-widgets': 'home',
      'v3:profile': 'profile',
    });
  });

  test('nutrition 선택은 nutrition key와 공통 key를 복원 대상으로 고른다', () => {
    expect(
      pickLocalStorageForScopes(
        {
          'v3:nutrition-menu-order': 'nutrition',
          'v3:profile': 'profile',
          'v3:jette-settings': 'jette',
        },
        ['nutrition']
      )
    ).toEqual({
      'v3:nutrition-menu-order': 'nutrition',
      'v3:profile': 'profile',
    });
  });

  test('선택된 모듈이 없으면 localStorage 복원 대상을 만들지 않는다', () => {
    expect(persistentLocalStorageKeysForScopes([])).toEqual([]);
    expect(pickLocalStorageForScopes({ 'v3:profile': 'profile' }, [])).toBeUndefined();
  });
});
