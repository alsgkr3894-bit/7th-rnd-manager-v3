/**
 * lib/db/sync-guard.js 회귀 테스트.
 * 2026-09-17 사고 재현 방지: 로컬이 비어 있는 authoritative 브라우저가 서버 행을
 * id 충돌로 덮어쓰지 못하게 막는 조건 4가지를 고정한다.
 */
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

const readServerManifest = jest.fn();
const readHydrateJournal = jest.fn();
const collectStoreStats = jest.fn();

jest.unstable_mockModule('@/lib/active-brand', () => ({ getActiveBrandId: () => 'main' }));
jest.unstable_mockModule('../../lib/db/server-hydrate.js', () => ({
  readServerManifest,
  readHydrateJournal,
}));
jest.unstable_mockModule('../../lib/db/store-stats.js', () => ({ collectStoreStats }));

let guard;

beforeEach(async () => {
  jest.resetModules();
  readServerManifest.mockReset();
  readHydrateJournal.mockReset();
  collectStoreStats.mockReset();
  readHydrateJournal.mockReturnValue(null);
  globalThis.window = { dispatchEvent: () => {}, addEventListener: () => {} };
  guard = await import('../../lib/db/sync-guard.js');
});

afterEach(() => {
  delete globalThis.window;
});

describe('evaluateSyncGuard — 차단 조건', () => {
  test('서버에 행이 있고 로컬이 비어 있고 저널이 없으면 차단한다', async () => {
    readServerManifest.mockResolvedValue({ totalRows: 241179 });
    collectStoreStats.mockResolvedValue({ menu_master: 0, cost_edge_dough: 0 });

    const state = await guard.evaluateSyncGuard('main');

    expect(state.blocked).toBe(true);
    expect(state.serverRows).toBe(241179);
    expect(guard.isSyncGuardBlocked()).toBe(true);
  });

  test('로컬에 데이터가 있으면(진짜 운영 PC) 차단하지 않는다', async () => {
    readServerManifest.mockResolvedValue({ totalRows: 241179 });
    collectStoreStats.mockResolvedValue({ menu_master: 88, cost_edge_dough: 5 });

    const state = await guard.evaluateSyncGuard('main');

    expect(state.blocked).toBe(false);
  });

  test('서버가 비어 있으면(새 설치) 차단하지 않는다', async () => {
    readServerManifest.mockResolvedValue({ totalRows: 0 });
    collectStoreStats.mockResolvedValue({ menu_master: 0 });

    const state = await guard.evaluateSyncGuard('main');

    expect(state.blocked).toBe(false);
  });

  test('하이드레이션 저널이 있으면(이미 한 번 불러옴) 차단하지 않는다', async () => {
    readHydrateJournal.mockReturnValue({ ok: true, totalRows: 100 });

    const state = await guard.evaluateSyncGuard('main');

    expect(state.blocked).toBe(false);
    expect(readServerManifest).not.toHaveBeenCalled();
  });

  test('settings·migration_flags는 로컬 행 합계에서 제외한다', async () => {
    readServerManifest.mockResolvedValue({ totalRows: 10 });
    collectStoreStats.mockResolvedValue({ settings: 3, migration_flags: 1, menu_master: 0 });

    const state = await guard.evaluateSyncGuard('main');

    expect(state.blocked).toBe(true);
    expect(state.localRows).toBe(0);
  });

  test('평가 자체가 실패하면(서버 다운 등) 차단하지 않는다', async () => {
    readServerManifest.mockRejectedValue(new Error('network down'));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const state = await guard.evaluateSyncGuard('main');

    expect(state.blocked).toBe(false);
    warnSpy.mockRestore();
  });
});

describe('noteSyncGuardHeld / clearSyncGuard', () => {
  test('noteSyncGuardHeld는 heldCount를 늘린다', async () => {
    readServerManifest.mockResolvedValue({ totalRows: 10 });
    collectStoreStats.mockResolvedValue({ menu_master: 0 });
    await guard.evaluateSyncGuard('main');

    guard.noteSyncGuardHeld();
    guard.noteSyncGuardHeld();

    expect(guard.getSyncGuardState().heldCount).toBe(2);
  });

  test('clearSyncGuard는 차단·보류 카운트를 모두 초기화한다', async () => {
    readServerManifest.mockResolvedValue({ totalRows: 10 });
    collectStoreStats.mockResolvedValue({ menu_master: 0 });
    await guard.evaluateSyncGuard('main');
    guard.noteSyncGuardHeld();

    guard.clearSyncGuard();

    expect(guard.getSyncGuardState()).toMatchObject({ blocked: false, heldCount: 0 });
    expect(guard.isSyncGuardBlocked()).toBe(false);
  });
});
