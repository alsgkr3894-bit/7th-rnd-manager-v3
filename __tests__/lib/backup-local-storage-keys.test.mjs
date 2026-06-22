import { afterEach, describe, expect, test } from '@jest/globals';
import {
  COMMON_LS_KEYS,
  LOCAL_STORAGE_KEYS_BY_SCOPE,
  PERSISTENT_LS_KEYS,
  collectLocalStorage,
  isSavedViewStorageKey,
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
        'v3:home-todo-done',
        'v3:profile',
        'v3:brand-master',
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
          'v3:home-todo-done': '["todo-1"]',
          'v3:profile': 'profile',
          'v3:brand-master': 'brands',
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
      'v3:home-todo-done': '["todo-1"]',
      'v3:profile': 'profile',
      'v3:brand-master': 'brands',
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

  test('저장뷰 키는 허용된 saved_views 패턴만 백업/복원 대상으로 본다', () => {
    expect(isSavedViewStorageKey('saved_views_v1__main__ingredient-manage')).toBe(true);
    expect(isSavedViewStorageKey('saved_views_v1_default__china4__ingredient-manage')).toBe(true);
    expect(isSavedViewStorageKey('saved_views_v1__main__')).toBe(false);
    expect(isSavedViewStorageKey('saved_views_v1__main__../secret')).toBe(false);
    expect(isSavedViewStorageKey('saved_views_v1__main__ingredient manage')).toBe(false);
    expect(isSavedViewStorageKey('saved_views_v2__main__ingredient-manage')).toBe(false);
  });

  test('collectLocalStorage는 동적 saved views 키를 포함하고 검색/draft 키는 제외한다', () => {
    installMapStorage({
      'v3:profile': 'profile',
      saved_views_v1__main__ingredient: '[{"name":"기본"}]',
      saved_views_v1_default__main__ingredient: '기본',
      saved_views_v1__main__bad_slash: 'ok',
      'v3:note-search': 'search',
      'v3:note-draft-write': 'draft',
      report_draft_sales: 'report-draft',
    });

    expect(collectLocalStorage()).toEqual({
      'v3:profile': 'profile',
      saved_views_v1__main__ingredient: '[{"name":"기본"}]',
      saved_views_v1_default__main__ingredient: '기본',
      saved_views_v1__main__bad_slash: 'ok',
    });
  });

  test('보고서 draft와 운영 임시 키는 백업/복원 원본에서 제외한다', () => {
    const store = installMapStorage({
      'v3:profile': 'profile',
      report_draft_sales: 'sales',
      report_draft_cost: 'cost',
      report_draft_price: 'price',
      report_draft_shipment: 'shipment',
      report_draft_compare: 'compare',
      'v3:active-brand': 'main',
      'v3:backup-history': 'history',
      'v3:restore-journal:last': 'journal',
      'v3:auth-hash': 'hash',
      'v3:settings-pin': 'pin',
      'v3:last-ip': 'ip',
      'v3:last-login': 'login',
      action_center_state_v1: 'action',
      recipe_recent_ingredients: 'recent',
      'v3:sales-pending-reclassify': 'pending',
    });

    expect(collectLocalStorage()).toEqual({ 'v3:profile': 'profile' });

    expect(
      restoreLocalStorage({
        report_draft_sales: 'restore-sales',
        'v3:backup-history': 'restore-history',
        action_center_state_v1: 'restore-action',
        'v3:profile': 'restore-profile',
      })
    ).toBe(1);
    expect(store['v3:profile']).toBe('restore-profile');
    expect(store.report_draft_sales).toBe('sales');
    expect(store['v3:backup-history']).toBe('history');
    expect(store.action_center_state_v1).toBe('action');
  });

  test('동적 키 순회가 막혀도 정적 localStorage 백업은 계속된다', () => {
    installStorage({
      get length() {
        throw new Error('length blocked');
      },
      key() {
        throw new Error('key blocked');
      },
      getItem(key) {
        return key === 'v3:profile' ? 'profile' : null;
      },
    });

    expect(collectLocalStorage()).toEqual({ 'v3:profile': 'profile' });
  });

  test('일부 localStorage.key(index)가 실패해도 다음 동적 키를 계속 수집한다', () => {
    installStorage({
      get length() {
        return 3;
      },
      key(index) {
        if (index === 1) throw new Error('broken key');
        return [
          'saved_views_v1__main__ingredient',
          'saved_views_v1__main__skip',
          'rnd_active_account_id:brand-b',
        ][index];
      },
      getItem(key) {
        return `value:${key}`;
      },
    });

    expect(collectLocalStorage()).toMatchObject({
      saved_views_v1__main__ingredient: 'value:saved_views_v1__main__ingredient',
      'rnd_active_account_id:brand-b': 'value:rnd_active_account_id:brand-b',
    });
  });

  test('스코프 선택 복원도 동적 saved views 키를 허용한다', () => {
    expect(
      pickLocalStorageForScopes(
        {
          'v3:profile': 'profile',
          saved_views_v1__main__ingredient: '[{"name":"기본"}]',
          saved_views_v1_default__main__ingredient: '기본',
          saved_views_v1__main__bad_path: 'ok',
          'saved_views_v1__main__bad/path': 'skip',
          'v3:note-draft-write': 'draft',
        },
        ['cost']
      )
    ).toEqual({
      'v3:profile': 'profile',
      saved_views_v1__main__ingredient: '[{"name":"기본"}]',
      saved_views_v1_default__main__ingredient: '기본',
      saved_views_v1__main__bad_path: 'ok',
    });
  });

  test('pickLocalStorageForScopes는 큰 맵에서도 정적 허용 키를 순서와 무관하게 고른다', () => {
    const huge = {};
    for (let i = 0; i < 2100; i += 1) {
      huge[`v3:unknown-${i}`] = 'skip';
    }
    huge['v3:profile'] = 'too-late';

    expect(pickLocalStorageForScopes(huge, ['cost'])).toEqual({ 'v3:profile': 'too-late' });
  });

  test('restoreLocalStorage는 동적 saved views 키를 복원하고 위험 패턴은 제외한다', () => {
    const store = installMapStorage({});

    expect(
      restoreLocalStorage({
        saved_views_v1__main__ingredient: '[{"name":"기본"}]',
        saved_views_v1_default__main__ingredient: '기본',
        'saved_views_v1__main__bad/path': 'skip',
        'v3:note-draft-write': 'draft',
      })
    ).toBe(2);
    expect(store.saved_views_v1__main__ingredient).toBe('[{"name":"기본"}]');
    expect(store.saved_views_v1_default__main__ingredient).toBe('기본');
    expect(store['saved_views_v1__main__bad/path']).toBeUndefined();
    expect(store['v3:note-draft-write']).toBeUndefined();
  });

  test('restoreLocalStorage는 과도하게 큰 입력을 제한하고 오류로 보고한다', () => {
    const store = installMapStorage({});
    const backup = { 'v3:profile': 'profile' };
    for (let i = 0; i < 2100; i += 1) {
      backup[`v3:unknown-${i}`] = 'skip';
    }
    const errors = [];

    expect(restoreLocalStorage(backup, undefined, { onError: error => errors.push(error) })).toBe(
      1
    );
    expect(store['v3:profile']).toBe('profile');
    expect(errors).toEqual([
      {
        key: '*',
        error: 'localStorage 복원 입력이 너무 커서 2000개까지만 확인했습니다',
      },
    ]);
  });

  test('restoreLocalStorage는 큰 입력 뒤쪽의 정적 허용 키도 놓치지 않는다', () => {
    const store = installMapStorage({});
    const backup = {};
    for (let i = 0; i < 2100; i += 1) {
      backup[`v3:unknown-${i}`] = 'skip';
    }
    backup['v3:profile'] = 'late-profile';
    const errors = [];

    expect(restoreLocalStorage(backup, undefined, { onError: error => errors.push(error) })).toBe(
      1
    );
    expect(store['v3:profile']).toBe('late-profile');
    expect(errors).toEqual([
      {
        key: '*',
        error: 'localStorage 복원 입력이 너무 커서 2000개까지만 확인했습니다',
      },
    ]);
  });

  test('restoreLocalStorage는 값 getter가 실패한 키만 건너뛴다', () => {
    const store = installMapStorage({});
    const backup = { 'v3:profile': 'profile' };
    Object.defineProperty(backup, 'v3:brand-master', {
      enumerable: true,
      get() {
        throw new Error('broken getter');
      },
    });

    expect(restoreLocalStorage(backup)).toBe(1);
    expect(store['v3:profile']).toBe('profile');
    expect(store['v3:brand-master']).toBeUndefined();
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
        'v3:note_lastCategory',
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
