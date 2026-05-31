/**
 * __tests__/lib/platforms-mirror.test.mjs
 * 플랫폼 수수료 IndexedDB 미러링 테스트
 *
 * lib/db 와 localStorage 를 stub 해서 순수 로직만 검증한다.
 */

import { jest } from '@jest/globals';

// ── stubs ────────────────────────────────────────────────────────────────────

// @/lib/note/keys stub
const KEYS = { COST_PLATFORMS: 'v3:cost-platforms' };

// @/lib/db stubs (mutable per-test)
let _hasStore = true;
let _dbRecord  = null;
const putCalls  = [];

const dbStub = {
  hasStore: async () => _hasStore,
  getById:  async (store, id) => (store === 'cost_platform_fees' && id === 'config' ? _dbRecord : null),
  put:      async (store, record) => { putCalls.push({ store, record }); },
  initDB:   async () => {},
};

// Inject mocks before importing the module under test
jest.unstable_mockModule('@/lib/note/keys', () => ({ KEYS }));
jest.unstable_mockModule('@/lib/db', () => dbStub);

// localStorage stub
const _ls = {};
const localStorageStub = {
  getItem:    (k) => (k in _ls ? _ls[k] : null),
  setItem:    (k, v) => { _ls[k] = v; },
  removeItem: (k) => { delete _ls[k]; },
};

// Node 환경에는 localStorage / indexedDB がないので globally stub する
globalThis.localStorage = localStorageStub;
globalThis.indexedDB    = {}; // 존재만 확인

// ── dynamic import (mocks must be registered first) ─────────────────────────
const { loadPlatforms, savePlatforms, hydratePlatformsFromDB, DEFAULT_PLATFORMS } =
  await import('../../lib/cost/margin/platforms.js');

// ── helpers ──────────────────────────────────────────────────────────────────
function resetLS()     { for (const k of Object.keys(_ls)) delete _ls[k]; }
function resetPutLog() { putCalls.length = 0; }

// ── loadPlatforms ─────────────────────────────────────────────────────────────
describe('loadPlatforms()', () => {
  beforeEach(resetLS);

  test('localStorage 없으면 DEFAULT_PLATFORMS 반환', () => {
    const result = loadPlatforms();
    expect(result).toEqual(DEFAULT_PLATFORMS);
  });

  test('localStorage 있으면 파싱 결과 반환', () => {
    const data = [{ id: 'test', name: '테스트', fees: [] }];
    _ls[KEYS.COST_PLATFORMS] = JSON.stringify(data);
    expect(loadPlatforms()).toEqual(data);
  });
});

// ── savePlatforms ─────────────────────────────────────────────────────────────
describe('savePlatforms()', () => {
  beforeEach(() => { resetLS(); resetPutLog(); _hasStore = true; });

  test('localStorage에 즉시 동기 기록', () => {
    const data = [{ id: 'x', name: 'X', fees: [] }];
    savePlatforms(data);
    expect(JSON.parse(_ls[KEYS.COST_PLATFORMS])).toEqual(data);
  });

  test('IndexedDB put 호출 (스토어 있을 때)', async () => {
    _hasStore = true;
    const data = [{ id: 'baemin', name: '배달의민족', fees: [] }];
    savePlatforms(data);
    // fire-and-forget — 약간 대기
    await new Promise(r => setTimeout(r, 10));
    expect(putCalls.length).toBe(1);
    expect(putCalls[0].store).toBe('cost_platform_fees');
    expect(putCalls[0].record.id).toBe('config');
    expect(putCalls[0].record.platforms).toEqual(data);
    expect(typeof putCalls[0].record.updatedAt).toBe('string');
  });

  test('스토어 없으면 IndexedDB put 호출 안 함', async () => {
    _hasStore = false;
    savePlatforms([{ id: 'x', name: 'X', fees: [] }]);
    await new Promise(r => setTimeout(r, 10));
    expect(putCalls.length).toBe(0);
  });
});

// ── hydratePlatformsFromDB ────────────────────────────────────────────────────
describe('hydratePlatformsFromDB()', () => {
  beforeEach(() => { resetLS(); _hasStore = true; _dbRecord = null; });

  test('localStorage 비어있고 DB 레코드 있으면 localStorage 복원', async () => {
    const data = [{ id: 'visit', name: '방문', fees: [] }];
    _dbRecord = { id: 'config', platforms: data, updatedAt: '2026-01-01T00:00:00.000Z' };
    await hydratePlatformsFromDB();
    expect(JSON.parse(_ls[KEYS.COST_PLATFORMS])).toEqual(data);
  });

  test('localStorage 이미 있으면 덮어쓰지 않음 (localStorage 우선)', async () => {
    const existing = [{ id: 'existing', name: '기존', fees: [] }];
    _ls[KEYS.COST_PLATFORMS] = JSON.stringify(existing);
    const dbData = [{ id: 'from-db', name: 'DB', fees: [] }];
    _dbRecord = { id: 'config', platforms: dbData, updatedAt: '2026-01-01T00:00:00.000Z' };
    await hydratePlatformsFromDB();
    expect(JSON.parse(_ls[KEYS.COST_PLATFORMS])).toEqual(existing);
  });

  test('스토어 없으면 아무것도 하지 않음', async () => {
    _hasStore = false;
    _dbRecord = { id: 'config', platforms: [{ id: 'x', name: 'X', fees: [] }] };
    await hydratePlatformsFromDB();
    expect(_ls[KEYS.COST_PLATFORMS]).toBeUndefined();
  });

  test('DB 레코드 없으면 localStorage 변경 없음', async () => {
    _dbRecord = null;
    await hydratePlatformsFromDB();
    expect(_ls[KEYS.COST_PLATFORMS]).toBeUndefined();
  });

  test('오류 발생해도 예외를 throw하지 않음', async () => {
    // hasStore가 throw하도록 임시 override
    const orig = dbStub.hasStore;
    dbStub.hasStore = async () => { throw new Error('DB error'); };
    await expect(hydratePlatformsFromDB()).resolves.toBeUndefined();
    dbStub.hasStore = orig;
  });
});
