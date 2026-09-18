/**
 * server-sync.js가 lib/db/sync-guard.js의 차단 상태를 실제로 지킨다는 것을 확인한다
 * (2026-09-17 사고: 로컬이 비어 있는 authoritative 브라우저가 서버 행을 덮어씀).
 */
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

const fetchAppJson = jest.fn();
let blocked = false;
const isSyncGuardBlocked = jest.fn(() => blocked);
const noteSyncGuardHeld = jest.fn();

jest.unstable_mockModule('@/lib/session', () => ({ fetchAppJson }));
jest.unstable_mockModule('@/lib/active-brand', () => ({ getActiveBrandId: () => 'main' }));
jest.unstable_mockModule('@/lib/db/sync-mode', () => ({ isAuthoritativeClient: () => true }));
jest.unstable_mockModule('../../lib/db/sync-guard.js', () => ({
  isSyncGuardBlocked,
  noteSyncGuardHeld,
}));

const originalWindow = globalThis.window;
let sync;

beforeEach(async () => {
  jest.resetModules();
  fetchAppJson.mockReset();
  isSyncGuardBlocked.mockClear();
  noteSyncGuardHeld.mockClear();
  blocked = false;
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
    const [, options] = fetchAppJson.mock.calls[0];
    const recordKeys = JSON.parse(options.body).operations.map(op => op.recordKey);
    // recordKey '1'(차단 중 보류된 것)은 큐에 애초에 안 들어갔으므로 전송에 없어야 한다.
    expect(recordKeys).toEqual(['2']);
  });
});
