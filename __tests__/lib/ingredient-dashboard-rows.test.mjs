import { describe, expect, jest, test } from '@jest/globals';

const metas = [
  { id: 1, productCode: 'A', ingredientName: '연동' },
  // 제때 연동으로 만들었지만 최신 가격파일에서 코드가 사라진 항목
  { id: 2, productCode: 'GONE', ingredientName: '사라진 코드' },
  { id: 3, ingredientName: '수동', isManual: true },
  { id: 4 }, // 코드도 이름도 없는 행
];

jest.unstable_mockModule('../../lib/price/index.js', () => ({
  getPriceFiles: async () => [{ id: 1, updateDate: '2026-11-23' }],
  getPriceRowsByFileId: async () => [{ productCode: 'A', productName: '연동', priceWithTax: 100 }],
}));
jest.unstable_mockModule('../../lib/ingredient/index.js', () => ({
  getAllIngredients: async () => metas,
  getIngredientMetaMap: async () => new Map([['A', metas[0]]]),
  mergeIngredientRows: rows => rows.map(row => ({ ...row, hasRecord: true, jetteLinked: true })),
  buildMetaOnlyRow: meta => ({ ...meta, jetteLinked: false }),
}));

const { getIngredientDashboard } = await import('../../lib/ingredient/dashboard.js');

describe('getIngredientDashboard', () => {
  test('식자재 관리 목록과 같은 식자재를 센다', async () => {
    await expect(getIngredientDashboard()).resolves.toMatchObject({
      totalCount: 3,
      linkedCount: 1,
    });
  });
});
