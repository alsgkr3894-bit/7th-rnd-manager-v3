/**
 * 점검 2단계: 서버(또는 PostgreSQL)가 내려간 사이에 탭을 닫아도 변경이 사라지지 않는지.
 * 보관함 객체 하나를 두 번의 '앱 실행'(모듈 초기화)이 함께 써서 다시 켠 상황을 만든다.
 */
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { createMemoryOutbox } from '../../lib/db/sync-outbox.js';

const fetchAppJson = jest.fn();
let blocked = false;
let beacons = [];
let listeners = {};

jest.unstable_mockModule('@/lib/session', () => ({ fetchAppJson }));
jest.unstable_mockModule('@/lib/active-brand', () => ({ getActiveBrandId: () => 'main' }));
jest.unstable_mockModule('@/lib/db/sync-mode', () => ({ isAuthoritativeClient: () => true }));
jest.unstable_mockModule('../../lib/db/sync-guard.js', () => ({
  isSyncGuardBlocked: () => blocked,
  isSyncGuardPending: () => false,
  ensureSyncGuardEvaluated: async () => ({ blocked }),
  noteSyncGuardHeld: () => {},
}));

const originalWindow = globalThis.window;
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
let outbox;

async function openApp() {
  jest.resetModules();
  const outboxModule = await import('../../lib/db/sync-outbox.js');
  outboxModule.setSyncOutbox(outbox);
  return import('../../lib/db/server-sync.js');
}

const sent = () => fetchAppJson.mock.calls.map(call => JSON.parse(call[1].body).operations);
const serverDown = () =>
  fetchAppJson.mockRejectedValue(Object.assign(new Error('HTTP 503'), { status: 503 }));
const serverUp = () => fetchAppJson.mockResolvedValue({ ok: true });
const settle = () => new Promise(resolve => setImmediate(resolve));

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['setImmediate', 'queueMicrotask', 'nextTick'] });
  outbox = createMemoryOutbox();
  blocked = false;
  beacons = [];
  listeners = {};
  fetchAppJson.mockReset();
  globalThis.window = { addEventListener: (name, handler) => (listeners[name] = handler) };
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { sendBeacon: (_url, blob) => beacons.push(blob) > 0 },
  });
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
  globalThis.window = originalWindow;
  if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
});

describe('미전송 작업 보관', () => {
  test('서버 장애 중에 닫아도 다시 켜면 같은 작업 ID로 순서대로 보낸다', async () => {
    const first = await openApp();
    serverDown();
    first.queueStoreRowUpsert('cost_ingredients', 1, { id: 1, name: '처음' });
    first.queueStoreRowDelete('cost_ingredients', 2);
    await first.flushServerStoreSyncQueue();
    await settle();
    const failed = sent()[0];
    expect((await outbox.list()).map(entry => entry.opId)).toEqual(failed.map(op => op.opId));

    fetchAppJson.mockReset();
    serverUp();
    const second = await openApp();
    second.queueStoreRowUpsert('cost_ingredients', 1, { id: 1, name: '나중' });
    await second.drainServerStoreSyncQueue();

    const operations = sent().flat();
    expect(operations.map(op => [op.type, op.recordKey, op.data?.name])).toEqual([
      ['upsert', '1', '처음'],
      ['delete', '2', undefined],
      ['upsert', '1', '나중'],
    ]);
    expect(operations.slice(0, 2).map(op => op.opId)).toEqual(failed.map(op => op.opId));
    expect(new Set(operations.map(op => op.opId)).size).toBe(3);
    expect(await outbox.list()).toEqual([]);
  });

  test('앱을 열기만 해도(새 저장 없이) 남은 작업을 보낸다', async () => {
    const first = await openApp();
    serverDown();
    first.queueStoreRowUpsert('menu_master', 5, { id: 5 });
    await first.flushServerStoreSyncQueue();
    await settle();

    fetchAppJson.mockReset();
    serverUp();
    const second = await openApp();
    await second.resumeServerStoreSync();
    expect(second.getPendingServerStoreSyncCount()).toBe(1);
    await second.flushServerStoreSyncQueue();
    await settle();

    expect(
      sent()
        .flat()
        .map(op => op.recordKey)
    ).toEqual(['5']);
    expect(await outbox.list()).toEqual([]);
  });

  test('영구 거절된 작업은 보관함에서 빼고, 거절 목록은 다시 켜도 남는다', async () => {
    const first = await openApp();
    fetchAppJson.mockRejectedValue(Object.assign(new Error('거절'), { status: 400 }));
    first.queueStoreRowUpsert('cost_ingredients', 1, { id: 1 });
    await first.flushServerStoreSyncQueue();
    await first.drainServerStoreSyncQueue();
    expect(await outbox.list()).toEqual([]);

    const second = await openApp();
    await second.resumeServerStoreSync();
    expect(second.getServerStoreSyncDeadLetters()).toEqual([
      expect.objectContaining({ storeName: 'cost_ingredients', recordKey: '1' }),
    ]);
  });

  test('다시 만들 수 있는 작업(persist:false)은 보관하지 않고 작업 ID도 없다', async () => {
    const sync = await openApp();
    serverDown();
    sync.queueStoreRowUpsert('menu_master', 1, { id: 1 }, { persist: false });
    await sync.flushServerStoreSyncQueue();
    await settle();

    expect(await outbox.list()).toEqual([]);
    expect(sent()[0][0].opId).toBeUndefined();
  });

  test('서버 덮어쓰기 가드가 막은 브라우저는 보관된 작업도 보내지 않고 버린다', async () => {
    const first = await openApp();
    serverDown();
    first.queueStoreRowUpsert('menu_master', 1, { id: 1 });
    await first.flushServerStoreSyncQueue();
    await settle();

    blocked = true;
    fetchAppJson.mockReset();
    serverUp();
    const second = await openApp();
    await second.drainServerStoreSyncQueue();

    expect(fetchAppJson).not.toHaveBeenCalled();
    expect(await outbox.list()).toEqual([]);
  });

  test('페이지를 닫을 때 보낸 작업도 확인 전에는 보관함과 큐에 남는다', async () => {
    const sync = await openApp();
    serverDown();
    sync.queueStoreRowUpsert('menu_master', 1, { id: 1 });
    await sync.flushServerStoreSyncQueue();
    await settle();

    listeners.pagehide();

    expect(beacons).toHaveLength(1);
    expect(sync.getPendingServerStoreSyncCount()).toBe(1);
    expect(await outbox.list()).toHaveLength(1);
  });
});
