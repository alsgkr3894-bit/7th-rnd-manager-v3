/**
 * 점검 4단계: 서버 전송은 건수뿐 아니라 바이트로도 나눈다. 사진이 든 저장이 모이면
 * 한 요청이 20MB 상한에 걸리고, 서버는 원본·문자열·객체를 동시에 들고 있게 된다.
 */
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

const fetchAppJson = jest.fn();

jest.unstable_mockModule('@/lib/session', () => ({ fetchAppJson }));
jest.unstable_mockModule('@/lib/active-brand', () => ({ getActiveBrandId: () => 'main' }));
jest.unstable_mockModule('@/lib/db/sync-mode', () => ({ isAuthoritativeClient: () => true }));
jest.unstable_mockModule('../../lib/db/sync-guard.js', () => ({
  isSyncGuardBlocked: () => false,
  isSyncGuardPending: () => false,
  ensureSyncGuardEvaluated: async () => ({ blocked: false }),
  noteSyncGuardHeld: () => {},
}));

const originalWindow = globalThis.window;
let sync;

const bodies = () => fetchAppJson.mock.calls.map(call => call[1].body);
const keysOf = body => JSON.parse(body).operations.map(operation => operation.recordKey);

beforeEach(async () => {
  jest.resetModules();
  fetchAppJson.mockReset();
  fetchAppJson.mockResolvedValue({ ok: true });
  globalThis.window = { addEventListener: () => {} };
  sync = await import('../../lib/db/server-sync.js');
});

afterEach(() => {
  globalThis.window = originalWindow;
});

const upsert = (id, data = {}) => sync.queueStoreRowUpsert('cost_ingredients', id, { id, ...data });

describe('서버 전송 나누기', () => {
  test('작은 저장은 100건씩 보낸다', async () => {
    for (let id = 1; id <= 250; id += 1) upsert(id);
    await sync.drainServerStoreSyncQueue();

    expect(bodies().map(body => keysOf(body).length)).toEqual([100, 100, 50]);
    expect(bodies().flatMap(keysOf)).toEqual(Array.from({ length: 250 }, (_, i) => String(i + 1)));
  });

  test('큰 저장은 요청마다 4MB를 넘지 않게 순서대로 나눈다', async () => {
    const photo = 'a'.repeat(1_500_000);
    for (let id = 1; id <= 5; id += 1) upsert(id, { photo });
    await sync.drainServerStoreSyncQueue();

    expect(bodies().map(keysOf)).toEqual([['1', '2'], ['3', '4'], ['5']]);
    for (const body of bodies()) {
      expect(sync.utf8Bytes(body)).toBeLessThanOrEqual(sync.MAX_BATCH_BYTES + 100);
    }
  });

  test('상한보다 큰 작업 하나는 혼자 보낸다', async () => {
    upsert(1);
    upsert(2, { photo: 'a'.repeat(sync.MAX_BATCH_BYTES + 10) });
    upsert(3);
    await sync.drainServerStoreSyncQueue();

    expect(bodies().map(keysOf)).toEqual([['1'], ['2'], ['3']]);
  });

  test('한글은 글자 수가 아니라 바이트로 센다', async () => {
    expect(sync.utf8Bytes('ab한😀é')).toBe(new TextEncoder().encode('ab한😀é').byteLength);
    const note = '가'.repeat(900_000); // 2.7MB
    upsert(1, { note });
    upsert(2, { note });
    await sync.drainServerStoreSyncQueue();

    expect(bodies().map(keysOf)).toEqual([['1'], ['2']]);
  });

  test('꽉 찬 묶음이 밀려 있으면 쉬지 않고 보내고, 남은 적은 저장만 잠깐 모은다', async () => {
    jest.useFakeTimers();
    try {
      for (let id = 1; id <= 250; id += 1) upsert(id);
      await jest.advanceTimersByTimeAsync(150);
      // 첫 묶음 뒤 150건이 남았으니 두 번째는 바로 나간다
      await jest.advanceTimersByTimeAsync(1);
      expect(bodies().map(body => keysOf(body).length)).toEqual([100, 100]);

      await jest.advanceTimersByTimeAsync(100);
      expect(bodies()).toHaveLength(2);
      await jest.advanceTimersByTimeAsync(60);
      expect(bodies().map(body => keysOf(body).length)).toEqual([100, 100, 50]);
    } finally {
      jest.useRealTimers();
    }
  });

  test('전송에 실패하면 꺼낸 작업이 순서 그대로 남는다', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    fetchAppJson.mockRejectedValueOnce(Object.assign(new Error('down'), { status: 503 }));
    const photo = 'a'.repeat(1_500_000);
    for (let id = 1; id <= 3; id += 1) upsert(id, { photo });
    await expect(sync.drainServerStoreSyncQueue()).rejects.toThrow('down');
    expect(sync.getPendingServerStoreSyncCount()).toBe(3);

    sync.retryServerStoreSyncNow();
    await sync.drainServerStoreSyncQueue();
    expect(bodies().slice(1).flatMap(keysOf)).toEqual(['1', '2', '3']);
  });
});
