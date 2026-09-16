/**
 * 서버 푸시 큐의 "독약 알약" 회귀 테스트.
 * 서버가 4xx로 영구 거절한 배치를 통째로 큐 앞에 되돌리면 그 뒤의 모든 저장이 영원히 막힌다
 * (운영 PC 저장이 수개월 서버에 못 간 원인). 거절된 작업만 격리하고 나머지는 흘려보내야 한다.
 * 5xx/네트워크 장애는 기존처럼 배치를 되돌려 재시도한다.
 */
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

const fetchAppJson = jest.fn();

jest.unstable_mockModule('@/lib/session', () => ({ fetchAppJson }));
jest.unstable_mockModule('@/lib/active-brand', () => ({ getActiveBrandId: () => 'main' }));
jest.unstable_mockModule('@/lib/db/sync-mode', () => ({ isAuthoritativeClient: () => true }));

function httpError(status, message = `HTTP ${status}`) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function bodyOf(call) {
  return JSON.parse(call[1].body).operations;
}

const originalWindow = globalThis.window;
let sync;
let warnSpy;

beforeEach(async () => {
  // 재시도 대기(30s) 타이머가 실제로 걸리지 않게 가짜 타이머 사용
  jest.useFakeTimers();
  jest.resetModules();
  fetchAppJson.mockReset();
  globalThis.window = { addEventListener: () => {} };
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  sync = await import('../../lib/db/server-sync.js');
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  warnSpy.mockRestore();
  globalThis.window = originalWindow;
});

describe('flushServerStoreSyncQueue — 영구 거절(4xx) 격리', () => {
  test('배치가 4xx면 하나씩 재전송해 거절된 작업만 격리하고 나머지는 서버에 전달한다', async () => {
    fetchAppJson.mockImplementation(async (_path, options) => {
      const operations = bodyOf([null, options]);
      if (operations.some(op => op.storeName === 'unknown_store')) {
        throw httpError(400, '스토어 동기화 처리에 실패했습니다');
      }
      return { ok: true };
    });

    sync.queueStoreRowUpsert('cost_ingredients', 1, { id: 1, name: 'A' });
    sync.queueStoreRowUpsert('unknown_store', 2, { id: 2 });
    sync.queueStoreRowUpsert('cost_ingredients', 3, { id: 3, name: 'C' });

    const result = await sync.flushServerStoreSyncQueue();

    expect(result).toEqual({ ok: true, isolated: true });
    // 1회 배치 + 3회 개별 재전송
    expect(fetchAppJson).toHaveBeenCalledTimes(4);
    expect(bodyOf(fetchAppJson.mock.calls[0]).map(op => op.recordKey)).toEqual(['1', '2', '3']);

    const dead = sync.getServerStoreSyncDeadLetters();
    expect(dead).toHaveLength(1);
    expect(dead[0]).toMatchObject({
      type: 'upsert',
      storeName: 'unknown_store',
      recordKey: '2',
      error: '스토어 동기화 처리에 실패했습니다',
    });

    // 큐가 비었으므로 다음 저장은 정상 배치로 바로 나간다.
    sync.queueStoreRowUpsert('cost_ingredients', 4, { id: 4 });
    await sync.flushServerStoreSyncQueue();
    expect(bodyOf(fetchAppJson.mock.calls.at(-1)).map(op => op.recordKey)).toEqual(['4']);
    await expect(sync.drainServerStoreSyncQueue()).resolves.toBeUndefined();
  });

  test('clearServerStoreSyncDeadLetters로 격리 목록을 비운다', async () => {
    fetchAppJson.mockRejectedValue(httpError(422));
    sync.queueStoreRowDelete('cost_ingredients', 9);
    await sync.flushServerStoreSyncQueue();
    expect(sync.getServerStoreSyncDeadLetters()).toHaveLength(1);
    sync.clearServerStoreSyncDeadLetters();
    expect(sync.getServerStoreSyncDeadLetters()).toEqual([]);
  });
});

describe('flushServerStoreSyncQueue — 일시 장애(5xx/네트워크) 재시도', () => {
  test('5xx면 배치를 되돌리고 대기 후 재시도한다(격리하지 않음)', async () => {
    fetchAppJson.mockRejectedValue(httpError(503));
    sync.queueStoreRowUpsert('cost_ingredients', 1, { id: 1 });
    sync.queueStoreRowUpsert('cost_ingredients', 2, { id: 2 });

    const result = await sync.flushServerStoreSyncQueue();

    expect(result.ok).toBe(false);
    expect(result.error.status).toBe(503);
    expect(fetchAppJson).toHaveBeenCalledTimes(1);
    expect(sync.getServerStoreSyncDeadLetters()).toEqual([]);
    // 30초 대기 중이므로 drain은 "지연됨"으로 실패해야 한다(큐는 보존).
    await expect(sync.drainServerStoreSyncQueue()).rejects.toThrow(/deferred/);
  });

  test('status 없는 네트워크 오류도 재시도 경로를 탄다', async () => {
    fetchAppJson.mockRejectedValue(new TypeError('Failed to fetch'));
    sync.queueStoreRowUpsert('cost_ingredients', 1, { id: 1 });

    const result = await sync.flushServerStoreSyncQueue();

    expect(result.ok).toBe(false);
    expect(sync.getServerStoreSyncDeadLetters()).toEqual([]);
  });

  test('격리 재전송 중 일시 장애가 나면 남은 작업을 되돌려 재시도한다', async () => {
    let calls = 0;
    fetchAppJson.mockImplementation(async () => {
      calls += 1;
      if (calls === 1) throw httpError(400); // 배치 거절
      if (calls === 2) return { ok: true }; // 개별 1건 성공
      throw httpError(500); // 개별 2건째에서 서버 장애
    });
    sync.queueStoreRowUpsert('cost_ingredients', 1, { id: 1 });
    sync.queueStoreRowUpsert('cost_ingredients', 2, { id: 2 });
    sync.queueStoreRowUpsert('cost_ingredients', 3, { id: 3 });

    const result = await sync.flushServerStoreSyncQueue();

    expect(result.ok).toBe(false);
    expect(result.error.status).toBe(500);
    expect(sync.getServerStoreSyncDeadLetters()).toEqual([]);
  });
});
