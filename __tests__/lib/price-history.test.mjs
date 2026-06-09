/**
 * __tests__/lib/price-history.test.mjs
 *
 * 단위 테스트: lib/cost/price-history.js
 *
 * DB 의존 함수(put, getAll, getByIndex)는 jest.mock으로 격리.
 * buildHistoryRecord(순수 함수)와 비즈니스 규칙(NO-OP 가드,
 * hasStore 가드, 정렬)을 검증한다.
 */

import { jest } from '@jest/globals';

// ── DB 모킹 ──────────────────────────────────────────────────────
// hasStore와 DB 함수를 모듈 모킹으로 제어
const mockPut = jest.fn();
const mockGetByIndex = jest.fn();
const mockGetAll = jest.fn();
let mockHasStore = jest.fn(() => true);

jest.unstable_mockModule('@/lib/db', () => ({
  put: (...args) => mockPut(...args),
  getByIndex: (...args) => mockGetByIndex(...args),
  getAll: (...args) => mockGetAll(...args),
  hasStore: (...args) => mockHasStore(...args),
}));

// 모킹 후 import
const { buildHistoryRecord, recordPriceChange, getHistoryByIngredient, getAllHistory } =
  await import('../../lib/cost/price-history.js');

// ── buildHistoryRecord (순수 함수) ────────────────────────────────

describe('buildHistoryRecord', () => {
  test('필드를 올바르게 조합한다', () => {
    const changedAt = '2026-05-31T10:00:00.000Z';
    const record = buildHistoryRecord(
      {
        ingredientId: 42,
        productCode: 'P001',
        ingredientName: '모짜렐라',
        oldPrice: 4500,
        newPrice: 5000,
        source: 'register',
      },
      changedAt
    );
    expect(record).toEqual({
      ingredientId: 42,
      productCode: 'P001',
      ingredientName: '모짜렐라',
      oldPrice: 4500,
      newPrice: 5000,
      source: 'register',
      changedAt,
    });
    // id 필드는 없어야 한다 (autoIncrement)
    expect('id' in record).toBe(false);
  });

  test('undefined 옵션 필드는 null로 채운다', () => {
    const record = buildHistoryRecord(
      { ingredientId: 1, newPrice: 1000, source: 'bulk' },
      '2026-01-01T00:00:00.000Z'
    );
    expect(record.productCode).toBeNull();
    expect(record.ingredientName).toBeNull();
    expect(record.oldPrice).toBeNull();
  });
});

// ── recordPriceChange NO-OP 가드 ──────────────────────────────────

describe('recordPriceChange — NO-OP 가드', () => {
  beforeEach(() => {
    mockPut.mockClear();
    mockHasStore.mockReturnValue(true);
  });

  test('newPrice == null 이면 put 호출 없음', async () => {
    await recordPriceChange({
      ingredientId: 1,
      productCode: 'A',
      ingredientName: '테스트',
      oldPrice: 1000,
      newPrice: null,
      source: 'edit',
    });
    expect(mockPut).not.toHaveBeenCalled();
  });

  test('oldPrice === newPrice 이면 put 호출 없음', async () => {
    await recordPriceChange({
      ingredientId: 1,
      productCode: 'A',
      ingredientName: '테스트',
      oldPrice: 2000,
      newPrice: 2000,
      source: 'edit',
    });
    expect(mockPut).not.toHaveBeenCalled();
  });

  test('hasStore가 false면 put 호출 없음', async () => {
    mockHasStore.mockReturnValue(false);
    await recordPriceChange({
      ingredientId: 1,
      productCode: 'A',
      ingredientName: '테스트',
      oldPrice: 1000,
      newPrice: 2000,
      source: 'edit',
    });
    expect(mockPut).not.toHaveBeenCalled();
  });

  test('가격이 다르면 put 호출됨', async () => {
    mockPut.mockResolvedValue(99);
    await recordPriceChange({
      ingredientId: 5,
      productCode: 'B',
      ingredientName: '소금',
      oldPrice: 300,
      newPrice: 400,
      source: 'register',
    });
    expect(mockPut).toHaveBeenCalledTimes(1);
    const [storeName, record] = mockPut.mock.calls[0];
    expect(storeName).toBe('cost_ingredient_price_history');
    expect(record).toMatchObject({
      ingredientId: 5,
      productCode: 'B',
      ingredientName: '소금',
      oldPrice: 300,
      newPrice: 400,
      source: 'register',
    });
    expect(typeof record.changedAt).toBe('string');
  });

  test('oldPrice가 null인 신규 가격 등록도 기록됨', async () => {
    mockPut.mockResolvedValue(100);
    await recordPriceChange({
      ingredientId: 7,
      productCode: 'C',
      ingredientName: '버터',
      oldPrice: null,
      newPrice: 5000,
      source: 'bulk',
    });
    expect(mockPut).toHaveBeenCalledTimes(1);
  });

  test('put이 throw해도 호출자로 예외를 전파하지 않음', async () => {
    mockPut.mockRejectedValue(new Error('DB 오류'));
    await expect(
      recordPriceChange({
        ingredientId: 1,
        productCode: 'X',
        ingredientName: '치즈',
        oldPrice: 100,
        newPrice: 200,
        source: 'edit',
      })
    ).resolves.toBeUndefined();
  });
});

// ── getHistoryByIngredient ────────────────────────────────────────

describe('getHistoryByIngredient', () => {
  beforeEach(() => {
    mockGetByIndex.mockClear();
    mockHasStore.mockReturnValue(true);
  });

  test('hasStore false면 [] 반환', async () => {
    mockHasStore.mockReturnValue(false);
    const result = await getHistoryByIngredient(1);
    expect(result).toEqual([]);
    expect(mockGetByIndex).not.toHaveBeenCalled();
  });

  test('changedAt 내림차순 정렬', async () => {
    const rows = [
      { id: 1, changedAt: '2026-01-01T00:00:00.000Z' },
      { id: 3, changedAt: '2026-05-31T12:00:00.000Z' },
      { id: 2, changedAt: '2026-03-15T08:00:00.000Z' },
    ];
    mockGetByIndex.mockResolvedValue(rows);
    const result = await getHistoryByIngredient(42);
    expect(result.map(r => r.id)).toEqual([3, 2, 1]);
  });

  test('원본 배열을 변경하지 않음 (불변성)', async () => {
    const rows = [
      { id: 1, changedAt: '2026-01-01T00:00:00.000Z' },
      { id: 2, changedAt: '2026-06-01T00:00:00.000Z' },
    ];
    mockGetByIndex.mockResolvedValue(rows);
    await getHistoryByIngredient(1);
    expect(rows[0].id).toBe(1); // 원본 순서 유지
  });

  test('getByIndex 실패 시 [] 반환', async () => {
    mockGetByIndex.mockRejectedValue(new Error('인덱스 오류'));
    const result = await getHistoryByIngredient(1);
    expect(result).toEqual([]);
  });
});

// ── getAllHistory ─────────────────────────────────────────────────

describe('getAllHistory', () => {
  beforeEach(() => {
    mockGetAll.mockClear();
    mockHasStore.mockReturnValue(true);
  });

  test('hasStore false면 [] 반환', async () => {
    mockHasStore.mockReturnValue(false);
    const result = await getAllHistory();
    expect(result).toEqual([]);
    expect(mockGetAll).not.toHaveBeenCalled();
  });

  test('changedAt 내림차순 정렬', async () => {
    const rows = [
      { id: 10, changedAt: '2026-02-01T00:00:00.000Z' },
      { id: 11, changedAt: '2026-04-01T00:00:00.000Z' },
      { id: 12, changedAt: '2026-01-01T00:00:00.000Z' },
    ];
    mockGetAll.mockResolvedValue(rows);
    const result = await getAllHistory();
    expect(result.map(r => r.id)).toEqual([11, 10, 12]);
  });

  test('getAll 실패 시 [] 반환', async () => {
    mockGetAll.mockRejectedValue(new Error('전체 조회 오류'));
    const result = await getAllHistory();
    expect(result).toEqual([]);
  });
});
