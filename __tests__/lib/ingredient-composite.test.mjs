/**
 * Tests for compositeOf validation logic in lib/ingredient/store.js.
 *
 * Strategy:
 *  - findMissingRefs  (pure function) — tested directly, no DB required.
 *  - validateCompositeRefs (async wrapper) — tested via jest.unstable_mockModule;
 *    module-level mock setup uses @jest/globals (required for ESM + vm-modules).
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// ── ESM mock setup (must precede dynamic import of store) ─────

jest.unstable_mockModule('@/lib/db', () => ({
  hasStore:       jest.fn(),
  getAll:         jest.fn(),
  runTransaction: jest.fn(),
}));

jest.unstable_mockModule('@/lib/work-log', () => ({
  logWork: jest.fn().mockResolvedValue(undefined),
}));

// Dynamic imports resolved after mocks are registered
const { findMissingRefs, validateCompositeRefs } = await import('../../lib/ingredient/store.js');
const { hasStore: mockHasStore, getAll: mockGetAll } = await import('@/lib/db');

// ── findMissingRefs (pure) ────────────────────────────────────

describe('findMissingRefs', () => {
  const codes = (list) => new Set(list.map(c => c.toLowerCase()));

  test('empty compositeOf → returns []', () => {
    expect(findMissingRefs([], codes(['A', 'B']))).toEqual([]);
  });

  test('null compositeOf → returns []', () => {
    expect(findMissingRefs(null, codes(['A']))).toEqual([]);
  });

  test('undefined compositeOf → returns []', () => {
    expect(findMissingRefs(undefined, codes(['A']))).toEqual([]);
  });

  test('all refs present → returns []', () => {
    expect(findMissingRefs(['A', 'B'], codes(['a', 'b', 'c']))).toEqual([]);
  });

  test('all refs missing → returns all codes', () => {
    expect(findMissingRefs(['X', 'Y'], codes(['A', 'B']))).toEqual(['X', 'Y']);
  });

  test('partial refs missing → returns only missing codes', () => {
    expect(findMissingRefs(['A', 'MISSING'], codes(['a']))).toEqual(['MISSING']);
  });

  test('case-insensitive: "ABC" matches existing "abc"', () => {
    expect(findMissingRefs(['ABC'], codes(['abc']))).toEqual([]);
  });

  test('case-insensitive: mixed casing all present', () => {
    expect(findMissingRefs(['ABC', 'xyz'], codes(['abc', 'xyz']))).toEqual([]);
  });

  test('trims whitespace in compositeOf entries', () => {
    expect(findMissingRefs(['  A  '], codes(['a']))).toEqual([]);
  });

  test('blank entries after trim are skipped (not flagged as missing)', () => {
    expect(findMissingRefs(['', '   '], codes([]))).toEqual([]);
  });

  test('single ref present → ok', () => {
    expect(findMissingRefs(['CODE-01'], codes(['code-01']))).toEqual([]);
  });

  test('single ref absent → flagged', () => {
    expect(findMissingRefs(['CODE-99'], codes(['code-01']))).toEqual(['CODE-99']);
  });

  test('empty existingCodes set → all refs missing', () => {
    expect(findMissingRefs(['A', 'B', 'C'], new Set())).toEqual(['A', 'B', 'C']);
  });

  test('preserves original casing in returned missing list', () => {
    expect(findMissingRefs(['FooBar', 'BAZ'], new Set())).toEqual(['FooBar', 'BAZ']);
  });
});

// ── validateCompositeRefs (async wrapper) ─────────────────────

describe('validateCompositeRefs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('empty compositeOf → { ok: true, missing: [] } without DB hit', async () => {
    const result = await validateCompositeRefs([]);
    expect(result).toEqual({ ok: true, missing: [] });
    expect(mockGetAll).not.toHaveBeenCalled();
  });

  test('null compositeOf → { ok: true, missing: [] }', async () => {
    expect(await validateCompositeRefs(null)).toEqual({ ok: true, missing: [] });
    expect(mockGetAll).not.toHaveBeenCalled();
  });

  test('undefined compositeOf → { ok: true, missing: [] }', async () => {
    expect(await validateCompositeRefs(undefined)).toEqual({ ok: true, missing: [] });
  });

  test('store absent → { ok: true, missing: [] } (non-blocking)', async () => {
    mockHasStore.mockReturnValue(false);
    expect(await validateCompositeRefs(['CODE-A'])).toEqual({ ok: true, missing: [] });
    expect(mockGetAll).not.toHaveBeenCalled();
  });

  test('all refs present → { ok: true, missing: [] }', async () => {
    mockHasStore.mockReturnValue(true);
    mockGetAll.mockResolvedValue([
      { productCode: 'CODE-A' },
      { productCode: 'CODE-B' },
    ]);
    expect(await validateCompositeRefs(['CODE-A', 'CODE-B'])).toEqual({ ok: true, missing: [] });
  });

  test('some refs missing → { ok: false, missing: [...] }', async () => {
    mockHasStore.mockReturnValue(true);
    mockGetAll.mockResolvedValue([{ productCode: 'CODE-A' }]);
    expect(await validateCompositeRefs(['CODE-A', 'CODE-GHOST']))
      .toEqual({ ok: false, missing: ['CODE-GHOST'] });
  });

  test('all refs missing → { ok: false, missing: all }', async () => {
    mockHasStore.mockReturnValue(true);
    mockGetAll.mockResolvedValue([]);
    expect(await validateCompositeRefs(['X', 'Y'])).toEqual({ ok: false, missing: ['X', 'Y'] });
  });

  test('case-insensitive match with DB records', async () => {
    mockHasStore.mockReturnValue(true);
    mockGetAll.mockResolvedValue([{ productCode: 'code-a' }]);
    expect(await validateCompositeRefs(['CODE-A'])).toEqual({ ok: true, missing: [] });
  });

  test('DB error → { ok: true, missing: [] } (non-blocking fallback)', async () => {
    mockHasStore.mockReturnValue(true);
    mockGetAll.mockRejectedValue(new Error('IDB failure'));
    expect(await validateCompositeRefs(['CODE-A'])).toEqual({ ok: true, missing: [] });
  });

  test('records without productCode excluded from known set', async () => {
    mockHasStore.mockReturnValue(true);
    mockGetAll.mockResolvedValue([{ ingredientName: '재료', productCode: null }]);
    expect(await validateCompositeRefs(['CODE-A'])).toEqual({ ok: false, missing: ['CODE-A'] });
  });
});
