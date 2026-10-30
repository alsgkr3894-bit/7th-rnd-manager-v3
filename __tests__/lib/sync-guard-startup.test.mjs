/**
 * 2026-10-30: 새 브라우저에서 화면이 뜨자마자 기본 제품 목록이 서버의 제때 관리품목을 덮어쓰려던 문제.
 * 가드의 시작값이 '안 막음'이었고, 평가가 시드 뒤에 돌아 '로컬이 비어 있음'을 못 알아봤다.
 */
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

const readServerManifest = jest.fn();
const readHydrateJournal = jest.fn();
const collectStoreStats = jest.fn();
let authoritative = true;

jest.unstable_mockModule('@/lib/active-brand', () => ({ getActiveBrandId: () => 'main' }));
jest.unstable_mockModule('../../lib/db/server-hydrate.js', () => ({
  readServerManifest,
  readHydrateJournal,
}));
jest.unstable_mockModule('../../lib/db/store-stats.js', () => ({ collectStoreStats }));
jest.unstable_mockModule('../../lib/db/sync-mode.js', () => ({
  isAuthoritativeClient: () => authoritative,
}));

function makeLocalStorage() {
  const map = new Map();
  return {
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: key => map.delete(key),
    _map: map,
  };
}

// 열린 DB 모형: 정해 둔 행 수를 count()로 돌려준다
function fakeDb(counts) {
  return {
    objectStoreNames: Object.keys(counts),
    transaction: names => ({
      objectStore: name => {
        if (!names.includes(name)) throw new Error('범위 밖 store');
        return {
          count: () => {
            const request = {};
            queueMicrotask(() => {
              request.result = counts[name];
              request.onsuccess?.();
            });
            return request;
          },
        };
      },
    }),
  };
}

const KEY = 'v3:sync-guard:unhydrated:main';
let guard;
let snapshot;
let constants;
let storage;

async function loadModules() {
  jest.resetModules();
  snapshot = await import('../../lib/db/startup-snapshot.js');
  guard = await import('../../lib/db/sync-guard.js');
  constants = await import('../../lib/db/constants.js');
}

beforeEach(async () => {
  readServerManifest.mockReset();
  readHydrateJournal.mockReset();
  collectStoreStats.mockReset();
  readHydrateJournal.mockReturnValue(null);
  collectStoreStats.mockResolvedValue({});
  authoritative = true;
  storage = makeLocalStorage();
  globalThis.localStorage = storage;
  globalThis.window = { dispatchEvent: () => {}, addEventListener: () => {} };
  await loadModules();
});

afterEach(() => {
  delete globalThis.window;
  delete globalThis.localStorage;
});

describe('시작 시점 스냅샷', () => {
  test('DB가 열린 직후의 행 수를 settings·migration_flags 제외하고 센다', async () => {
    snapshot.recordStartupRows(
      'db-main',
      fakeDb({ menu_master: 3, settings: 9, migration_flags: 4 })
    );
    await expect(snapshot.getStartupLocalRows(['db-main'])).resolves.toBe(3);
  });

  test('기록이 없는 DB가 하나라도 있으면 모름(null)', async () => {
    snapshot.recordStartupRows('db-main', fakeDb({ menu_master: 0 }));
    await expect(snapshot.getStartupLocalRows(['db-main', 'db-other'])).resolves.toBeNull();
  });

  test('같은 DB를 다시 열어도 처음 기록을 유지한다(이후 시드가 행을 넣어도 안 바뀜)', async () => {
    snapshot.recordStartupRows('db-main', fakeDb({ menu_master: 0 }));
    snapshot.recordStartupRows('db-main', fakeDb({ menu_master: 128 }));
    await expect(snapshot.getStartupLocalRows(['db-main'])).resolves.toBe(0);
  });

  test('읽기에 실패하면 null — 호출 쪽이 지금 상태를 직접 센다', async () => {
    snapshot.recordStartupRows('db-bad', {
      objectStoreNames: ['menu_master'],
      transaction: () => {
        throw new Error('boom');
      },
    });
    await expect(snapshot.getStartupLocalRows(['db-bad'])).resolves.toBeNull();
  });
});

describe('가드 — 시드가 이미 로컬에 행을 넣은 뒤에 평가돼도 새 브라우저를 알아본다', () => {
  test('시작 시점에 비어 있었으면, 지금 로컬에 시드된 128행이 있어도 차단한다', async () => {
    snapshot.recordStartupRows(constants.dbNameFor('main'), fakeDb({ ref_shipment_products: 0 }));
    // 평가 시점의 현재 상태(시드 후)는 128행 — 예전 방식이면 '비어 있지 않음'으로 풀렸다
    collectStoreStats.mockResolvedValue({ ref_shipment_products: 128 });
    readServerManifest.mockResolvedValue({ totalRows: 273254 });

    const state = await guard.evaluateSyncGuard('main');

    expect(state.blocked).toBe(true);
    expect(state.localRows).toBe(0);
    expect(collectStoreStats).not.toHaveBeenCalled();
  });

  test('시작 시점에 데이터가 있던 운영 PC는 차단하지 않는다', async () => {
    snapshot.recordStartupRows(constants.dbNameFor('main'), fakeDb({ menu_master: 88 }));
    readServerManifest.mockResolvedValue({ totalRows: 273254 });

    const state = await guard.evaluateSyncGuard('main');

    expect(state.blocked).toBe(false);
  });
});

describe('가드 — 비어 있던 채로 시작한 브라우저의 표식', () => {
  async function evaluateAsEmptyStart(serverRows) {
    snapshot.recordStartupRows(constants.dbNameFor('main'), fakeDb({ menu_master: 0 }));
    readServerManifest.mockResolvedValue({ totalRows: serverRows });
    return guard.evaluateSyncGuard('main');
  }

  test('차단되면 표식을 남기고, 다음에 열었을 때 시드된 행이 있어도 계속 차단한다', async () => {
    await evaluateAsEmptyStart(273254);
    expect(storage._map.get(KEY)).toBe('1');

    // 다음 방문: 이번엔 시작 시점에 (지난번 시드로) 128행이 있다
    await loadModules();
    snapshot.recordStartupRows(constants.dbNameFor('main'), fakeDb({ ref_shipment_products: 128 }));
    readServerManifest.mockResolvedValue({ totalRows: 273254 });

    const state = await guard.evaluateSyncGuard('main');
    expect(state.blocked).toBe(true);
  });

  test('서버에서 불러오면(clearSyncGuard) 표식과 차단이 풀린다', async () => {
    await evaluateAsEmptyStart(273254);
    expect(guard.isSyncGuardBlocked()).toBe(true);

    guard.clearSyncGuard();

    expect(guard.isSyncGuardBlocked()).toBe(false);
    expect(storage._map.has(KEY)).toBe(false);
    expect(guard.isSyncGuardPending()).toBe(false);
  });

  test('서버가 비어 있으면(새 설치) 표식을 지우고 차단하지 않는다', async () => {
    const state = await evaluateAsEmptyStart(0);
    expect(state.blocked).toBe(false);
    expect(storage._map.has(KEY)).toBe(false);
  });

  test('서버 확인 실패: 비어 있던 채로 시작했으면 계속 막고, 데이터가 있던 운영 PC는 막지 않는다', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    snapshot.recordStartupRows(constants.dbNameFor('main'), fakeDb({ menu_master: 0 }));
    readServerManifest.mockRejectedValue(new Error('서버 다운'));
    expect((await guard.evaluateSyncGuard('main')).blocked).toBe(true);

    storage = makeLocalStorage();
    globalThis.localStorage = storage;
    await loadModules();
    snapshot.recordStartupRows(constants.dbNameFor('main'), fakeDb({ menu_master: 88 }));
    readServerManifest.mockRejectedValue(new Error('서버 다운'));
    expect((await guard.evaluateSyncGuard('main')).blocked).toBe(false);

    warn.mockRestore();
  });
});

describe('가드 — 평가 전(pending) 상태', () => {
  test('평가 전에는 pending, 평가가 끝나면 pending이 아니다', async () => {
    expect(guard.isSyncGuardPending()).toBe(true);
    readServerManifest.mockResolvedValue({ totalRows: 0 });
    await guard.ensureSyncGuardEvaluated('main');
    expect(guard.isSyncGuardPending()).toBe(false);
  });

  test('동시에 여러 번 불러도 평가는 한 번만 돈다', async () => {
    readServerManifest.mockResolvedValue({ totalRows: 0 });
    await Promise.all([
      guard.ensureSyncGuardEvaluated('main'),
      guard.ensureSyncGuardEvaluated('main'),
      guard.ensureSyncGuardEvaluated('main'),
    ]);
    expect(readServerManifest).toHaveBeenCalledTimes(1);
  });

  test('운영 PC가 아닌 브라우저(뷰어)는 pending이 아니다 — 어차피 서버로 안 밀므로', () => {
    authoritative = false;
    expect(guard.isSyncGuardPending()).toBe(false);
  });
});
