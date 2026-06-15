import { afterEach, describe, expect, test } from '@jest/globals';
import {
  collectLocalStorage,
  persistentLocalStorageKeysForScopes,
  pickLocalStorageForScopes,
  restoreLocalStorage,
} from '../../lib/backup/local-storage-keys.js';

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

function installMapStorage(initial = {}) {
  const store = { ...initial };
  installStorage({
    get length() {
      return Object.keys(store).length;
    },
    key(index) {
      return Object.keys(store)[index] ?? null;
    },
    getItem(key) {
      return store[key] ?? null;
    },
    setItem(key, value) {
      store[key] = value;
    },
  });
  return store;
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
    const errors = [];
    installStorage({
      setItem(key, value) {
        if (key === 'bad') throw new Error('quota');
        saved[key] = value;
      },
    });

    expect(
      restoreLocalStorage(
        { good: '1', bad: '2', unknown: '3', nonString: 4 },
        ['good', 'bad', 'nonString'],
        {
          onError: error => errors.push(error),
        }
      )
    ).toBe(1);
    expect(saved).toEqual({ good: '1' });
    expect(errors).toEqual([{ key: 'bad', error: 'quota' }]);
  });

  test('모듈 선택에 맞는 localStorage key만 고른다', () => {
    expect(persistentLocalStorageKeysForScopes(['jette'])).toEqual(
      expect.arrayContaining([
        'v3:jette-settings',
        'v3:home-widgets',
        'v3:profile',
        'v3:density',
        'v3:roundMode',
        'v3:costRateAlert',
        'rnd_active_account_id',
      ])
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
          'v3:density': 'compact',
          'v3:roundMode': 'floor',
          rnd_active_account_id: '42',
          'rnd_active_account_id:brand-b': '7',
          'v3:nutrition-menu-order': 'nutrition',
          'v3:unknown': 'unknown',
        },
        ['jette']
      )
    ).toEqual({
      'v3:jette-settings': 'jette',
      'v3:home-widgets': 'home',
      'v3:profile': 'profile',
      'v3:density': 'compact',
      'v3:roundMode': 'floor',
      rnd_active_account_id: '42',
      'rnd_active_account_id:brand-b': '7',
    });
  });

  test('브랜드별 활성 계정 key도 공통 localStorage 백업/복원 대상으로 허용한다', () => {
    const store = installMapStorage({
      rnd_active_account_id: '1',
      'rnd_active_account_id:main': '2',
      'rnd_active_account_id:brand-b': '7',
      'rnd_active_account_id:': 'bad',
      other: 'skip',
    });

    expect(collectLocalStorage(['rnd_active_account_id'])).toEqual({
      rnd_active_account_id: '1',
      'rnd_active_account_id:main': '2',
      'rnd_active_account_id:brand-b': '7',
    });

    expect(
      restoreLocalStorage(
        {
          'rnd_active_account_id:brand-c': '9',
          'rnd_active_account_id:': 'bad',
          unknown: 'skip',
        },
        ['rnd_active_account_id']
      )
    ).toBe(1);
    expect(store['rnd_active_account_id:brand-c']).toBe('9');
    expect(store.unknown).toBeUndefined();
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
