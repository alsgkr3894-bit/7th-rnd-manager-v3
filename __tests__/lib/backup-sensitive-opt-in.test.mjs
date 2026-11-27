import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { readFileSync } from 'node:fs';

const rows = {
  menu_master: [{ id: 1 }],
  rnd_login_credentials: [{ id: 1, password: 'secret' }],
  rnd_corporate_card_entries: [{ id: 2 }],
};
const fakeDb = {
  objectStoreNames: Object.keys(rows),
  transaction: name => ({
    objectStore: () => ({
      getAll() {
        const request = {};
        queueMicrotask(() => {
          request.result = rows[name];
          request.onsuccess();
        });
        return request;
      },
    }),
  }),
};

jest.unstable_mockModule('../../lib/db/init.js', () => ({
  _getDB: () => fakeDb,
  getNamed: () => fakeDb,
  openNamed: async () => fakeDb,
  openAuxiliaryDB: async () => fakeDb,
  forgetHandle: () => {},
  initDB: async () => fakeDb,
}));
jest.unstable_mockModule('@/lib/auth/guard', () => ({ assertActiveAdmin: async () => {} }));

const { exportSelected } = await import('../../lib/db/backup.js');
const { hasSensitiveStores } = await import('@/lib/sensitive-stores');
const { buildModuleScopeMap } = await import('../../hooks/useModuleScopes.js');

const names = Object.keys(rows);

describe('백업의 민감 store', () => {
  beforeEach(() => jest.clearAllMocks());

  test('기본은 빈 배열도 넣지 않는다 — 복원할 때 현재 데이터가 지워지지 않는다', async () => {
    const data = await exportSelected(names, {}, { includeLocalStorage: false });

    expect(Object.keys(data.stores)).toEqual(['menu_master']);
    expect(data.excludedStores).toEqual(['rnd_login_credentials', 'rnd_corporate_card_entries']);
    expect(data.sharedStoreNames).toEqual([]);
    expect(JSON.stringify(data)).not.toContain('secret');
  });

  test('직접 고르면 담는다', async () => {
    const data = await exportSelected(
      names,
      {},
      {
        includeLocalStorage: false,
        includeSensitive: true,
      }
    );

    expect(data.stores.rnd_login_credentials).toHaveLength(1);
    expect(data.excludedStores).toBeUndefined();
    expect(hasSensitiveStores(data.stores)).toBe(true);
  });

  test('빈 배열로 담긴 파일도 현재 데이터를 지우므로 안전 백업 대상이다', () => {
    expect(hasSensitiveStores({ rnd_login_credentials: [] })).toBe(true);
    expect(hasSensitiveStores({ menu_master: [{ id: 1 }] })).toBe(false);
    expect(hasSensitiveStores(undefined)).toBe(false);
  });

  test('백업 화면은 RND 업무를 꺼 둔 채 시작하고 전체 선택에도 넣지 않는다', () => {
    expect(buildModuleScopeMap(true, ['rnd']).rnd).toBe(false);
    expect(buildModuleScopeMap(true, ['rnd']).cost).toBe(true);
    expect(buildModuleScopeMap(true).rnd).toBe(true);
    const page = readFileSync(
      new URL('../../app/settings/backup/page.jsx', import.meta.url),
      'utf8'
    );
    expect(page).toContain("useModuleScopes(true, { optIn: ['rnd'] })");
  });

  test('복원 전 안전 백업은 덮어쓸 파일에 민감 데이터가 있으면 함께 담는다', () => {
    const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
    expect(read('app/settings/restore/page.jsx')).toContain(
      'includeSensitive: hasSensitiveStores(pickRestoreStores(parsed.stores, selectedStores))'
    );
    expect(read('app/settings/brands/useBrandActions.jsx')).toContain(
      'includeSensitive: hasSensitiveStores(backup.stores)'
    );
  });
});
