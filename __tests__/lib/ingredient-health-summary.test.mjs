import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const hasStore = jest.fn();
const getAll = jest.fn();
const getPriceFiles = jest.fn();
const getPriceRowsByFileId = jest.fn();

jest.unstable_mockModule('@/lib/db', () => ({
  hasStore: (...args) => hasStore(...args),
  getAll: (...args) => getAll(...args),
  runTransaction: jest.fn(),
}));

jest.unstable_mockModule('@/lib/price', () => ({
  getPriceFiles: (...args) => getPriceFiles(...args),
  getPriceRowsByFileId: (...args) => getPriceRowsByFileId(...args),
}));

const { getIngredientHealthSummary } = await import('../../lib/ingredient/dedupe-repair.js');

beforeEach(() => {
  jest.clearAllMocks();
  hasStore.mockReturnValue(true);
  getAll.mockResolvedValue([]);
  getPriceFiles.mockResolvedValue([]);
  getPriceRowsByFileId.mockResolvedValue([]);
});

describe('getIngredientHealthSummary', () => {
  test('최신 가격과 수동 단가를 반영해서 홈 단가 없음 수를 계산한다', async () => {
    getAll.mockResolvedValue([
      {
        productCode: 'A-001',
        ingredientName: '미분류지만 가격 있음',
        category: '',
        baseQuantity: null,
        priceOverride: null,
      },
      {
        productCode: 'B-001',
        ingredientName: '수동 단가 있음',
        category: '',
        baseQuantity: null,
        priceOverride: 5000,
      },
      {
        productCode: 'C-001',
        ingredientName: '정말 단가 없음',
        category: '치즈',
        baseQuantity: 1000,
        priceOverride: null,
      },
      {
        productCode: 'D-001',
        ingredientName: '제외 항목',
        excluded: true,
      },
    ]);
    getPriceFiles.mockResolvedValue([{ id: 7 }]);
    getPriceRowsByFileId.mockResolvedValue([{ productCode: 'A-001', priceWithTax: 12000 }]);

    await expect(getIngredientHealthSummary()).resolves.toEqual({
      noPriceCount: 1,
      total: 3,
    });
  });

  test('가격 파일을 읽지 못해도 수동 단가 기준으로 안전하게 계산한다', async () => {
    getAll.mockResolvedValue([
      { ingredientName: '수동 단가 있음', priceOverride: 1000 },
      { ingredientName: '단가 없음', priceOverride: null },
    ]);
    getPriceFiles.mockRejectedValue(new Error('price store unavailable'));

    await expect(getIngredientHealthSummary()).resolves.toEqual({
      noPriceCount: 1,
      total: 2,
    });
  });
});
