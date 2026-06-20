import { afterEach, describe, expect, test } from '@jest/globals';
import {
  COMMON_LS_KEYS,
  LOCAL_STORAGE_KEYS_BY_SCOPE,
  PERSISTENT_LS_KEYS,
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
    expect(persistentLocalStorageKeysForScopes(['jette'])).not.toContain('v3:nutrition-menu-order');

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

describe('스코프별 복원 범위 정합성', () => {
  test('cost 스코프 — 원가 관련 키 포함, 제때·영양 키 제외', () => {
    const keys = persistentLocalStorageKeysForScopes(['cost']);
    expect(keys).toEqual(
      expect.arrayContaining([
        'v3:cost-platforms',
        'v3:margin-cost-warn',
        'v3:margin-cost-crit',
        'v3:recipe-sort',
      ])
    );
    expect(keys).not.toContain('v3:note-pins');
    expect(keys).not.toContain('v3:jette-settings');
    expect(keys).not.toContain('v3:nutrition-menu-order');
  });

  test('notes 스코프 — 노트·샘플 키 포함, 원가·제때 키 제외', () => {
    const keys = persistentLocalStorageKeysForScopes(['notes']);
    expect(keys).toEqual(
      expect.arrayContaining([
        'v3:note-sort',
        'v3:note-view',
        'v3:note-pins',
        'v3:note-presets',
        'v3:note-calendar-checklist',
        'v3:sample-sort',
        'v3:sample-view',
      ])
    );
    expect(keys).not.toContain('v3:cost-platforms');
    expect(keys).not.toContain('v3:jette-settings');
  });

  test('모든 스코프 합집합이 PERSISTENT_LS_KEYS 전체를 커버한다', () => {
    const allScopes = Object.keys(LOCAL_STORAGE_KEYS_BY_SCOPE);
    const combined = new Set(persistentLocalStorageKeysForScopes(allScopes));
    for (const key of PERSISTENT_LS_KEYS) {
      expect(combined.has(key)).toBe(true);
    }
  });

  test('LOCAL_STORAGE_KEYS_BY_SCOPE의 모든 키는 PERSISTENT_LS_KEYS에 존재한다', () => {
    const persistentSet = new Set(PERSISTENT_LS_KEYS);
    for (const [scope, keys] of Object.entries(LOCAL_STORAGE_KEYS_BY_SCOPE)) {
      for (const key of keys) {
        expect(persistentSet.has(key)).toBe(true);
      }
    }
  });

  test('COMMON_LS_KEYS의 모든 키는 PERSISTENT_LS_KEYS에 존재한다', () => {
    const persistentSet = new Set(PERSISTENT_LS_KEYS);
    for (const key of COMMON_LS_KEYS) {
      expect(persistentSet.has(key)).toBe(true);
    }
  });

  test('cost 스코프 pickLocalStorageForScopes — cost 키 포함, jette 키 제외', () => {
    const backup = {
      'v3:cost-platforms': 'A',
      'v3:jette-settings': 'B',
      'v3:profile': 'profile',
      'v3:unknown-key': 'skip',
    };
    const result = pickLocalStorageForScopes(backup, ['cost']);
    expect(result['v3:cost-platforms']).toBe('A');
    expect(result['v3:profile']).toBe('profile');
    expect(result['v3:jette-settings']).toBeUndefined();
    expect(result['v3:unknown-key']).toBeUndefined();
  });

  test('알 수 없는 스코프는 COMMON_LS_KEYS만 반환하고 오류 없이 동작한다', () => {
    const keys = persistentLocalStorageKeysForScopes(['unknown-scope']);
    const commonSet = new Set(COMMON_LS_KEYS);
    for (const key of keys) {
      expect(commonSet.has(key)).toBe(true);
    }

    const backup = { 'v3:profile': 'profile', 'v3:cost-platforms': 'skip' };
    const result = pickLocalStorageForScopes(backup, ['unknown-scope']);
    expect(result?.['v3:profile']).toBe('profile');
    expect(result?.['v3:cost-platforms']).toBeUndefined();
  });
});
