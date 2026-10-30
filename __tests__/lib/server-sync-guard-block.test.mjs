/**
 * server-sync.js가 lib/db/sync-guard.js의 차단·평가 상태를 실제로 지킨다는 것을 확인한다
 * (2026-09-17 사고: 로컬이 비어 있는 authoritative 브라우저가 서버 행을 덮어씀).
 * 2026-10-30: 평가가 끝나기 전의 쓰기도 서버로 나가던 구멍 — 평가가 끝날 때까지 들고 있다가 결과대로 처리한다.
 */
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

const fetchAppJson = jest.fn();
let blocked = false;
let pending = false;
let resolveEvaluation = null;
const isSyncGuardBlocked = jest.fn(() => blocked);
const isSyncGuardPending = jest.fn(() => pending);
const noteSyncGuardHeld = jest.fn();
const ensureSyncGuardEvaluated = jest.fn(
  () =>
    new Promise(resolve => {
      resolveEvaluation = nextBlocked => {
        blocked = nextBlocked;
        pending = false;
        resolve({ blocked });
      };
    })
);

jest.unstable_mockModule('@/lib/session', () => ({ fetchAppJson }));
jest.unstable_mockModule('@/lib/active-brand', () => ({ getActiveBrandId: () => 'main' }));
jest.unstable_mockModule('@/lib/db/sync-mode', () => ({ isAuthoritativeClient: () => true }));
jest.unstable_mockModule('../../lib/db/sync-guard.js', () => ({
  isSyncGuardBlocked,
  isSyncGuardPending,
  ensureSyncGuardEvaluated,
  noteSyncGuardHeld,
}));

const originalWindow = globalThis.window;
let sync;

const sentKeys = () =>
  fetchAppJson.mock.calls.flatMap(call =>
    JSON.parse(call[1].body).operations.map(o => o.recordKey)
  );
const flushMicrotasks = () => new Promise(resolve => setTimeout(resolve, 0));

beforeEach(async () => {
  jest.resetModules();
  fetchAppJson.mockReset();
  isSyncGuardBlocked.mockClear();
  isSyncGuardPending.mockClear();
  noteSyncGuardHeld.mockClear();
  ensureSyncGuardEvaluated.mockClear();
  blocked = false;
  pending = false;
  resolveEvaluation = null;
  globalThis.window = { addEventListener: () => {} };
  sync = await import('../../lib/db/server-sync.js');
});

afterEach(() => {
  globalThis.window = originalWindow;
});

describe('enqueue — sync-guard 차단 시 서버로 밀지 않는다', () => {
  test('차단 상태면 큐에 넣지 않고 noteSyncGuardHeld만 기록한다', async () => {
    blocked = true;
    sync.queueStoreRowUpsert('cost_ingredients', 1, { id: 1, name: 'A' });

    expect(noteSyncGuardHeld).toHaveBeenCalledTimes(1);
    await expect(sync.drainServerStoreSyncQueue()).resolves.toBeUndefined();
    expect(fetchAppJson).not.toHaveBeenCalled();
  });

  test('차단 해제 후에는 정상적으로 서버에 전송된다', async () => {
    blocked = true;
    sync.queueStoreRowUpsert('cost_ingredients', 1, { id: 1 });
    expect(noteSyncGuardHeld).toHaveBeenCalledTimes(1);

    blocked = false;
    fetchAppJson.mockResolvedValue({ ok: true });
    sync.queueStoreRowUpsert('cost_ingredients', 2, { id: 2 });
    await sync.flushServerStoreSyncQueue();

    expect(fetchAppJson).toHaveBeenCalledTimes(1);
    // recordKey '1'(차단 중 보류된 것)은 큐에 애초에 안 들어갔으므로 전송에 없어야 한다.
    expect(sentKeys()).toEqual(['2']);
  });

  test('큐에 들어간 뒤 막힘으로 바뀌면 보내기 직전에 걸러낸다', async () => {
    fetchAppJson.mockResolvedValue({ ok: true });
    sync.queueStoreRowUpsert('cost_ingredients', 1, { id: 1 });
    blocked = true; // 150ms 디바운스 사이에 가드가 막힘으로 바뀜

    await sync.flushServerStoreSyncQueue();

    expect(fetchAppJson).not.toHaveBeenCalled();
    expect(noteSyncGuardHeld).toHaveBeenCalledTimes(1);
  });
});

describe('enqueue — 가드 평가가 끝나기 전의 쓰기는 들고 있는다', () => {
  test('평가 중에는 서버로 보내지 않고, 막히지 않는 것으로 나오면 그때 보낸다', async () => {
    pending = true;
    fetchAppJson.mockResolvedValue({ ok: true });
    sync.queueStoreRowUpsert('ref_shipment_products', 1, { id: 1 });
    sync.queueStoreRowUpsert('ref_shipment_products', 2, { id: 2 });

    await sync.flushServerStoreSyncQueue();
    expect(fetchAppJson).not.toHaveBeenCalled();
    expect(ensureSyncGuardEvaluated).toHaveBeenCalledTimes(1); // 여러 쓰기가 한 번의 평가를 공유

    resolveEvaluation(false);
    await flushMicrotasks();
    await sync.drainServerStoreSyncQueue();

    expect(sentKeys()).toEqual(['1', '2']);
  });

  test('평가 결과가 막힘이면 들고 있던 쓰기는 서버로 가지 않는다(시드가 서버를 덮어쓰지 못함)', async () => {
    pending = true;
    sync.queueStoreRowUpsert('ref_shipment_products', 1, { id: 1 });
    sync.queueStoreRowUpsert('ref_shipment_products', 2, { id: 2 });

    resolveEvaluation(true);
    await flushMicrotasks();
    await expect(sync.drainServerStoreSyncQueue()).resolves.toBeUndefined();

    expect(fetchAppJson).not.toHaveBeenCalled();
    expect(noteSyncGuardHeld).toHaveBeenCalledTimes(2);
  });

  test('drain은 평가가 끝나기를 기다린 뒤 비운다', async () => {
    pending = true;
    fetchAppJson.mockResolvedValue({ ok: true });
    sync.queueStoreRowUpsert('cost_ingredients', 7, { id: 7 });

    const drained = sync.drainServerStoreSyncQueue();
    resolveEvaluation(false);
    await drained;

    expect(sentKeys()).toEqual(['7']);
  });
});
