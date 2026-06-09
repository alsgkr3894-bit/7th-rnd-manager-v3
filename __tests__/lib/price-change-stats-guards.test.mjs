import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const getAllHistory = jest.fn();
const getPriceFiles = jest.fn();
const getPriceRowsByFileId = jest.fn();

jest.unstable_mockModule('@/lib/cost/price-history', () => ({
  getAllHistory: (...args) => getAllHistory(...args),
}));

jest.unstable_mockModule('@/lib/price', () => ({
  getPriceFiles: (...args) => getPriceFiles(...args),
  getPriceRowsByFileId: (...args) => getPriceRowsByFileId(...args),
}));

const { getRecentPriceChanges } = await import('../../lib/stats/price-change-stats.js');

beforeEach(() => {
  jest.clearAllMocks();
  getAllHistory.mockResolvedValue([]);
  getPriceFiles.mockResolvedValue([]);
  getPriceRowsByFileId.mockResolvedValue([]);
});

describe('price change stats guards', () => {
  test('조회 결과가 비배열이면 빈 변동 목록으로 안전하게 내려간다', async () => {
    getAllHistory.mockResolvedValue('bad');
    getPriceFiles.mockResolvedValue(null);

    await expect(getRecentPriceChanges('bad')).resolves.toEqual([]);
    expect(getPriceRowsByFileId).not.toHaveBeenCalled();
  });

  test('깨진 행을 무시하고 수동 이력과 가격파일 변동을 중복 없이 합친다', async () => {
    getAllHistory.mockResolvedValue([
      null,
      { productCode: 'A', ingredientName: '치즈', oldPrice: '1000', newPrice: '1200' },
      { productCode: 'B', ingredientName: '소스', oldPrice: 'bad', newPrice: 2000 },
      { productCode: 'C', ingredientName: '토핑', oldPrice: 1000, newPrice: 1000 },
    ]);
    getPriceFiles.mockResolvedValue([{ id: 2 }, { id: 1 }]);
    getPriceRowsByFileId
      .mockResolvedValueOnce([
        null,
        { productCode: 'A', productName: '치즈 파일', priceWithTax: '1300' },
        { productCode: 123, priceWithTax: '750' },
      ])
      .mockResolvedValueOnce([
        { productCode: 'A', priceWithTax: '1200' },
        { productCode: 123, priceWithTax: '500' },
        { productCode: 'X', priceWithTax: 'bad' },
      ]);

    const result = await getRecentPriceChanges(6);

    expect(result).toEqual([
      {
        name: '123',
        sub: '500원 → 750원',
        pct: 50,
        dir: 'up',
      },
      {
        name: '치즈',
        sub: '1,000원 → 1,200원',
        pct: 20,
        dir: 'up',
      },
    ]);
  });

  test('limit은 안전한 정수로 보정한다', async () => {
    getAllHistory.mockResolvedValue([
      { productCode: 'A', oldPrice: 100, newPrice: 200 },
      { productCode: 'B', oldPrice: 100, newPrice: 300 },
    ]);

    await expect(getRecentPriceChanges(-1)).resolves.toEqual([]);
    await expect(getRecentPriceChanges(1)).resolves.toHaveLength(1);
    await expect(getRecentPriceChanges('bad')).resolves.toHaveLength(2);
  });
});
