/**
 * lib/db/server-repush.js — 운영 PC 로컬 전체를 서버로 재전송하는 계획/실행 테스트.
 * 2026-09-21: 사고 복구 뒤 서버 menu_master 20행이 PC보다 낡은 채 남은 문제의 해결 수단.
 */
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

const fetchAppJson = jest.fn();
const readServerManifest = jest.fn();
const queueStoreRowUpsert = jest.fn();
const queueStoreRowDelete = jest.fn();
const drainServerStoreSyncQueue = jest.fn(async () => undefined);
const getServerStoreSyncDeadLetters = jest.fn(() => []);
const isAuthoritativeClient = jest.fn(() => true);
const isSyncModeForcedReadonly = jest.fn(() => false);
const isSyncGuardBlocked = jest.fn(() => false);

// store → [{ id, ...data }] 형태의 가짜 IndexedDB(main/brand 구분 없이 하나로 충분).
let localStores = {};

function fakeRequest(compute) {
  const request = {};
  setTimeout(() => {
    try {
      request.result = compute();
      request.onsuccess?.();
    } catch (error) {
      request.error = error;
      request.onerror?.();
    }
  }, 0);
  return request;
}

const fakeDb = {
  objectStoreNames: { contains: name => name in localStores },
  transaction: name => ({
    objectStore: () => ({
      getAllKeys: () => fakeRequest(() => localStores[name].map(row => row.id)),
      getAll: (range, count) =>
        fakeRequest(() =>
          localStores[name].filter(row => (range ? row.id > range.lower : true)).slice(0, count)
        ),
    }),
  }),
};

jest.unstable_mockModule('@/lib/active-brand', () => ({ getActiveBrandId: () => 'main' }));
jest.unstable_mockModule('@/lib/session', () => ({ fetchAppJson }));
jest.unstable_mockModule('@/lib/server/sensitive-stores', () => ({
  LAN_EXCLUDED_STORE_NAMES: new Set(['rnd_login_credentials']),
}));
jest.unstable_mockModule('../../lib/db/constants.js', () => ({
  ALL_STORES: ['menu_master', 'cost_selling_prices', 'generated_reports', 'rnd_login_credentials'],
  dbNameFor: brandId => `db:${brandId}`,
}));
jest.unstable_mockModule('../../lib/db/init.js', () => ({
  openNamed: async () => fakeDb,
  getNamed: () => fakeDb,
}));
jest.unstable_mockModule('../../lib/db/module-stores.js', () => ({
  SHARED_STORE_NAMES: new Set(),
}));
jest.unstable_mockModule('../../lib/db/server-hydrate.js', () => ({ readServerManifest }));
jest.unstable_mockModule('../../lib/db/server-sync.js', () => ({
  drainServerStoreSyncQueue,
  getServerStoreSyncDeadLetters,
  keyPathForStore: () => 'id',
  queueStoreRowDelete,
  queueStoreRowUpsert,
}));
jest.unstable_mockModule('../../lib/db/sync-guard.js', () => ({ isSyncGuardBlocked }));
jest.unstable_mockModule('../../lib/db/sync-mode.js', () => ({
  isAuthoritativeClient,
  isSyncModeForcedReadonly,
}));

let repush;

function rows(count, extra = {}) {
  return Array.from({ length: count }, (_, i) => ({ id: i + 1, ...extra }));
}

beforeEach(async () => {
  jest.resetModules();
  [fetchAppJson, readServerManifest, queueStoreRowUpsert, queueStoreRowDelete].forEach(fn =>
    fn.mockReset()
  );
  drainServerStoreSyncQueue.mockClear();
  isAuthoritativeClient.mockReturnValue(true);
  isSyncModeForcedReadonly.mockReturnValue(false);
  isSyncGuardBlocked.mockReturnValue(false);
  getServerStoreSyncDeadLetters.mockReturnValue([]);
  globalThis.window = {};
  globalThis.IDBKeyRange = { lowerBound: (lower, open) => ({ lower, open }) };
  localStores = {
    menu_master: rows(86, { menuName: 'x' }),
    cost_selling_prices: rows(86),
    generated_reports: [],
    rnd_login_credentials: rows(2),
  };
  readServerManifest.mockResolvedValue({
    stores: [
      { storeName: 'menu_master', rows: 88 },
      { storeName: 'cost_selling_prices', rows: 86 },
      { storeName: 'generated_reports', rows: 3 },
    ],
  });
  // 서버 menu_master: 1..88 (87·88은 PC에서 지운 행)
  fetchAppJson.mockImplementation(async url => {
    const params = new URL(`http://x${url}`).searchParams;
    expect(params.get('storeName')).toBe('menu_master');
    return { rows: rows(88).map(r => ({ recordKey: String(r.id) })), nextCursor: null };
  });
  repush = await import('../../lib/db/server-repush.js');
});

afterEach(() => {
  delete globalThis.window;
  delete globalThis.IDBKeyRange;
});

describe('planServerRepush', () => {
  test('로컬 전체를 upsert 대상으로 잡고, 행 수가 다른 store만 서버 키를 비교해 삭제 대상을 찾는다', async () => {
    const plan = await repush.planServerRepush('main');

    expect(plan.totalUpserts).toBe(86 + 86);
    const menuMaster = plan.stores.find(s => s.storeName === 'menu_master');
    expect(menuMaster.deleteKeys).toEqual(['87', '88']);
    expect(plan.totalDeletes).toBe(2);
    // 행 수가 같은 store는 서버 키를 내려받지 않는다.
    expect(fetchAppJson).toHaveBeenCalledTimes(1);
  });

  test('민감 store는 계획에서 제외하고, 로컬이 빈 store는 서버 행을 지우지 않는다', async () => {
    const plan = await repush.planServerRepush('main');

    expect(plan.stores.map(s => s.storeName)).not.toContain('rnd_login_credentials');
    const reports = plan.stores.find(s => s.storeName === 'generated_reports');
    expect(reports.deleteSkipped).toBe(true);
    expect(reports.deleteKeys).toEqual([]);
  });

  test('운영 PC가 아니거나 가드가 걸려 있으면 계획 단계에서 거부한다', async () => {
    isAuthoritativeClient.mockReturnValue(false);
    await expect(repush.planServerRepush('main')).rejects.toThrow('운영 PC');

    isAuthoritativeClient.mockReturnValue(true);
    isSyncGuardBlocked.mockReturnValue(true);
    await expect(repush.planServerRepush('main')).rejects.toThrow('로컬이 비어');
  });
});

describe('runServerRepush', () => {
  test('store별로 청크를 큐에 넣고 전송이 끝난 뒤 서버에만 있는 행을 삭제한다', async () => {
    localStores.menu_master = rows(1200);
    readServerManifest.mockResolvedValue({ stores: [{ storeName: 'menu_master', rows: 1202 }] });
    fetchAppJson.mockResolvedValue({
      rows: rows(1202).map(r => ({ recordKey: String(r.id) })),
      nextCursor: null,
    });
    localStores = { menu_master: localStores.menu_master };
    const plan = await repush.planServerRepush('main');
    const progress = [];

    const result = await repush.runServerRepush(plan, { onProgress: p => progress.push(p) });

    expect(queueStoreRowUpsert).toHaveBeenCalledTimes(1200);
    expect(queueStoreRowUpsert.mock.calls[0]).toEqual([
      'menu_master',
      1,
      { id: 1 },
      { brandId: 'main' },
    ]);
    expect(queueStoreRowDelete.mock.calls).toEqual([
      ['menu_master', '1201', { brandId: 'main' }],
      ['menu_master', '1202', { brandId: 'main' }],
    ]);
    // 청크(500)마다 + 삭제 뒤 한 번 → 3 + 1
    expect(drainServerStoreSyncQueue).toHaveBeenCalledTimes(4);
    expect(result).toMatchObject({ sentRows: 1200, deletedRows: 2, rejectedRows: 0 });
    expect(progress.at(-1).phase).toBe('done');
  });

  test('서버가 거절한 건수를 결과에 넣는다', async () => {
    localStores = { menu_master: rows(3) };
    readServerManifest.mockResolvedValue({ stores: [{ storeName: 'menu_master', rows: 3 }] });
    const plan = await repush.planServerRepush('main');
    getServerStoreSyncDeadLetters.mockReturnValueOnce([]).mockReturnValue([{}, {}]);

    const result = await repush.runServerRepush(plan);

    expect(result.rejectedRows).toBe(2);
  });
});
