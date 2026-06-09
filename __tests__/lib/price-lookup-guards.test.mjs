import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const getPriceFiles = jest.fn();
const getPriceRowsByFileId = jest.fn();

jest.unstable_mockModule('@/lib/price/store', () => ({
  getPriceFiles: (...args) => getPriceFiles(...args),
  getPriceRowsByFileId: (...args) => getPriceRowsByFileId(...args),
}));

const { buildLatestPriceLookup } = await import('../../lib/price/price-lookup.js');

beforeEach(() => {
  jest.clearAllMocks();
  getPriceFiles.mockResolvedValue([]);
  getPriceRowsByFileId.mockResolvedValue([]);
});

describe('price lookup guards', () => {
  test('파일 목록이 비배열이거나 최신 파일 id가 없으면 빈 Map을 반환한다', async () => {
    getPriceFiles.mockResolvedValue('bad');
    await expect(buildLatestPriceLookup()).resolves.toEqual(new Map());
    expect(getPriceRowsByFileId).not.toHaveBeenCalled();

    getPriceFiles.mockResolvedValue([{ updateDate: '2026-06-01' }]);
    await expect(buildLatestPriceLookup()).resolves.toEqual(new Map());
    expect(getPriceRowsByFileId).not.toHaveBeenCalled();
  });

  test('깨진 행을 무시하고 유효한 제품코드와 숫자 단가만 Map에 담는다', async () => {
    getPriceFiles.mockResolvedValue([{ id: 7, updateDate: '2026-06-01' }]);
    getPriceRowsByFileId.mockResolvedValue([
      null,
      'bad',
      { productCode: 'A', priceWithTax: '1200' },
      { productCode: 'B', priceWithTax: 'bad' },
      { productCode: 123, priceWithTax: 0 },
      { productCode: '', priceWithTax: 500 },
    ]);

    const result = await buildLatestPriceLookup();

    expect(result).toEqual(
      new Map([
        ['A', 1200],
        ['123', 0],
      ])
    );
  });

  test('조회 중 예외가 나면 빈 Map을 반환한다', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    getPriceFiles.mockRejectedValue(new Error('db failed'));

    await expect(buildLatestPriceLookup()).resolves.toEqual(new Map());

    warnSpy.mockRestore();
  });
});
