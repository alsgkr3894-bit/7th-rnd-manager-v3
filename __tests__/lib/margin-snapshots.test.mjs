/**
 * __tests__/lib/margin-snapshots.test.mjs
 *
 * Unit tests for lib/cost/margin/snapshots.js pure logic.
 * Uses jest.unstable_mockModule (ESM-compatible) to mock @/lib/db.
 */

import { jest } from '@jest/globals';

// ─── In-memory store state (shared between mock factory and tests) ────────────

const state = {
  store: [],
  hasStore: true,
  putCount: 0,
  deleteCount: 0,
};

function resetState() {
  state.store.length = 0;
  state.hasStore = true;
  state.putCount = 0;
  state.deleteCount = 0;
}

// ─── Mock @/lib/db before dynamic import ─────────────────────────────────────

jest.unstable_mockModule('@/lib/db', () => ({
  hasStore: () => state.hasStore,
  getAll: async () => [...state.store],
  put: async (_storeName, record) => {
    state.putCount++;
    const id = state.putCount;
    state.store.push({ ...record, id });
    return id;
  },
  deleteById: async (_storeName, id) => {
    state.deleteCount++;
    const idx = state.store.findIndex(r => r.id === id);
    if (idx !== -1) state.store.splice(idx, 1);
  },
}));

// Dynamic import AFTER mock registration
const { getAllSnapshots, saveSnapshot, deleteSnapshot } =
  await import('../../lib/cost/margin/snapshots.js');

// ─── saveSnapshot ─────────────────────────────────────────────────────────────

describe('saveSnapshot', () => {
  beforeEach(resetState);

  test('필드가 올바르게 저장된다', async () => {
    const result = await saveSnapshot({
      capturedAt: '2026-05-31T10:00:00.000Z',
      label: '5월 스냅샷',
      avgCostRate: 32.5,
      avgMargin: 67.5,
      menuCount: 42,
      source: '전체',
    });
    expect(result).not.toBeNull();
    expect(result.capturedAt).toBe('2026-05-31T10:00:00.000Z');
    expect(result.label).toBe('5월 스냅샷');
    expect(result.avgCostRate).toBe(32.5);
    expect(result.avgMargin).toBe(67.5);
    expect(result.menuCount).toBe(42);
    expect(result.source).toBe('전체');
    expect(typeof result.id).toBe('number');
  });

  test('capturedAt 미전달 시 현재 시각 ISO 문자열이 채워진다', async () => {
    const before = Date.now();
    const result = await saveSnapshot({ avgCostRate: 35, avgMargin: 65, menuCount: 10 });
    const after = Date.now();
    expect(result).not.toBeNull();
    const t = new Date(result.capturedAt).getTime();
    expect(t).toBeGreaterThanOrEqual(before);
    expect(t).toBeLessThanOrEqual(after);
  });

  test('label 공백 트리밍', async () => {
    const result = await saveSnapshot({
      label: '  피자  ',
      avgCostRate: 30,
      avgMargin: 70,
      menuCount: 5,
    });
    expect(result.label).toBe('피자');
  });

  test('hasStore false → null 반환 (DB put 미호출)', async () => {
    state.hasStore = false;
    const result = await saveSnapshot({ avgCostRate: 30, avgMargin: 70, menuCount: 1 });
    expect(result).toBeNull();
    expect(state.putCount).toBe(0);
  });
});

// ─── getAllSnapshots ──────────────────────────────────────────────────────────

describe('getAllSnapshots', () => {
  beforeEach(resetState);

  test('빈 스토어 → 빈 배열 반환', async () => {
    const result = await getAllSnapshots();
    expect(result).toEqual([]);
  });

  test('capturedAt 오름차순 정렬', async () => {
    // Seed mock store directly to control insertion order
    state.store.push({ id: 1, capturedAt: '2026-05-03T00:00:00.000Z', label: 'C' });
    state.store.push({ id: 2, capturedAt: '2026-05-01T00:00:00.000Z', label: 'A' });
    state.store.push({ id: 3, capturedAt: '2026-05-02T00:00:00.000Z', label: 'B' });

    const result = await getAllSnapshots();
    expect(result.map(r => r.label)).toEqual(['A', 'B', 'C']);
  });

  test('hasStore false → 빈 배열 반환', async () => {
    state.store.push({ id: 1, capturedAt: '2026-05-01T00:00:00.000Z', label: 'X' });
    state.hasStore = false;
    const result = await getAllSnapshots();
    expect(result).toEqual([]);
  });
});

// ─── deleteSnapshot ───────────────────────────────────────────────────────────

describe('deleteSnapshot', () => {
  beforeEach(resetState);

  test('정상 삭제 후 getAll 에서 제거', async () => {
    await saveSnapshot({
      capturedAt: '2026-05-01T00:00:00.000Z',
      label: '삭제대상',
      avgCostRate: 30,
      avgMargin: 70,
      menuCount: 1,
    });
    const before = await getAllSnapshots();
    expect(before).toHaveLength(1);

    await deleteSnapshot(before[0].id);
    expect(state.deleteCount).toBe(1);

    const after = await getAllSnapshots();
    expect(after).toHaveLength(0);
  });

  test('hasStore false → deleteById 미호출', async () => {
    state.hasStore = false;
    await deleteSnapshot(99);
    expect(state.deleteCount).toBe(0);
  });
});
