/**
 * 민감 store(법인카드·로그인정보) 쓰기는 서버로 보내지 않는다.
 * 서버(lib/server/store-row-sync.js)가 이 store를 `Unknown storeName`으로 400 거절하므로,
 * 큐에 넣으면 저장할 때마다 거절 → dead letter로 쌓여 /settings/sync에 경고가 늘었다.
 * 브라우저(IndexedDB) 저장은 그대로이고, 서버 큐에만 넣지 않는다.
 */
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

const fetchAppJson = jest.fn();

jest.unstable_mockModule('@/lib/session', () => ({ fetchAppJson }));
jest.unstable_mockModule('@/lib/active-brand', () => ({ getActiveBrandId: () => 'main' }));
jest.unstable_mockModule('@/lib/db/sync-mode', () => ({ isAuthoritativeClient: () => true }));

const originalWindow = globalThis.window;
let sync;
let warnSpy;

beforeEach(async () => {
  jest.useFakeTimers();
  jest.resetModules();
  fetchAppJson.mockReset();
  fetchAppJson.mockResolvedValue({ ok: true });
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

function sentOperations() {
  return fetchAppJson.mock.calls.flatMap(call => JSON.parse(call[1].body).operations);
}

describe('서버 푸시 큐 — 민감 store 제외', () => {
  test('로그인정보·법인카드 저장/삭제/비우기는 서버로 보내지 않고 경고도 쌓지 않는다', async () => {
    sync.queueStoreRowUpsert('rnd_login_credentials', 1, { id: 1, site: 'x', password: 'p' });
    sync.queueStoreRowUpsert('rnd_corporate_card_entries', 2, { id: 2, amount: 1000 });
    sync.queueStoreRowDelete('rnd_login_credentials', 1);
    sync.queueStoreClear('rnd_corporate_card_entries');
    await sync.flushServerStoreSyncQueue();

    expect(sentOperations()).toEqual([]);
    expect(sync.getServerStoreSyncDeadLetters()).toEqual([]);
  });

  test('일반 store는 그대로 보낸다(같은 배치에 섞여 있어도)', async () => {
    sync.queueStoreRowUpsert('rnd_login_credentials', 1, { id: 1, password: 'p' });
    sync.queueStoreRowUpsert('cost_ingredients', 7, { id: 7, name: 'A' });
    await sync.flushServerStoreSyncQueue();

    expect(sentOperations().map(op => op.storeName)).toEqual(['cost_ingredients']);
  });
});
