import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const hasStore = jest.fn();
const getAll = jest.fn();
const getPriceFiles = jest.fn();
const getPriceRowsByFileId = jest.fn();

const dbMock = {
  hasStore: (...args) => hasStore(...args),
  getAll: (...args) => getAll(...args),
};

jest.unstable_mockModule('@/lib/db', () => dbMock);
jest.unstable_mockModule('../../lib/db/index.js', () => dbMock);

jest.unstable_mockModule('@/lib/price', () => ({
  getPriceFiles: (...args) => getPriceFiles(...args),
  getPriceRowsByFileId: (...args) => getPriceRowsByFileId(...args),
}));

jest.unstable_mockModule('@/lib/recipe', () => ({
  buildUnitPriceMap: (allMeta, priceRowMap) => {
    const map = new Map();
    for (const meta of allMeta) {
      if (!meta?.productCode) continue;
      const priceWithTax = priceRowMap.get(meta.productCode)?.priceWithTax ?? meta.priceOverride ?? null;
      map.set(meta.productCode, {
        unitPrice: meta.baseQuantity > 0 && priceWithTax != null
          ? priceWithTax / meta.baseQuantity
          : null,
      });
    }
    return map;
  },
  calcCostBySizes: (recipe, unitPriceMap) => {
    const result = {};
    for (const size of recipe.sizes) {
      result[size.label] = recipe.ingredients.reduce((sum, line) => {
        const qty = line.quantities?.[size.label] ?? 0;
        const unitPrice = unitPriceMap.get(line.productCode)?.unitPrice ?? 0;
        return sum + unitPrice * qty;
      }, 0);
    }
    return result;
  },
  calcMarginRate: (cost, sellingPrice) => (sellingPrice > 0 ? (cost / sellingPrice) * 100 : null),
}));

const { getCostAlertData } = await import('../../lib/stats/cost-stats.js');

beforeEach(() => {
  jest.clearAllMocks();
  hasStore.mockReturnValue(true);
  getAll.mockImplementation(async storeName => {
    if (storeName === 'cost_ingredients') return [];
    if (storeName === 'cost_recipes') return [];
    return [];
  });
  getPriceFiles.mockResolvedValue([]);
  getPriceRowsByFileId.mockResolvedValue([]);
});

describe('cost stats guards', () => {
  test('필수 스토어가 없으면 null을 반환하고 조회하지 않는다', async () => {
    hasStore.mockReturnValue(false);

    await expect(getCostAlertData()).resolves.toBeNull();
    expect(getAll).not.toHaveBeenCalled();
  });

  test('깨진 레시피와 가격 행을 무시하고 정상 원가율 항목만 만든다', async () => {
    getAll.mockImplementation(async storeName => {
      if (storeName === 'cost_ingredients') {
        return [
          null,
          { productCode: 'A', ingredientName: '치즈', baseQuantity: 100, priceOverride: 1000 },
        ];
      }
      if (storeName === 'cost_recipes') {
        return [
          null,
          'bad',
          {
            menuName: '치즈피자',
            menuCategory: '피자',
            ingredients: [{ productCode: 'A', quantities: { L: 50 } }],
            sizes: [{ label: 'L', sellingPrice: '2000' }],
          },
          {
            menuName: '깨진 레시피',
            ingredients: 'bad',
            sizes: [{ label: 'L', sellingPrice: 1000 }],
          },
          {
            menuName: '깨진 사이즈',
            ingredients: [{ productCode: 'A', quantities: { L: 50 } }],
            sizes: 'bad',
          },
        ];
      }
      return [];
    });
    getPriceFiles.mockResolvedValue([{ id: 3 }, null]);
    getPriceRowsByFileId.mockResolvedValue([
      null,
      'bad',
      { productCode: 'A', priceWithTax: 2000 },
    ]);

    const result = await getCostAlertData();

    expect(result).toEqual({
      items: [
        {
          menuName: '치즈피자',
          menuCategory: '피자',
          costRate: 50,
          cost: 1000,
          sellingPrice: 2000,
          size: 'L',
        },
      ],
      total: 1,
    });
  });

  test('가격 파일 목록이 깨져도 priceOverride 기반 요약은 유지한다', async () => {
    getAll.mockImplementation(async storeName => {
      if (storeName === 'cost_ingredients') {
        return [{ productCode: 'A', ingredientName: '치즈', baseQuantity: 100, priceOverride: 1000 }];
      }
      if (storeName === 'cost_recipes') {
        return [{
          menuName: 123,
          ingredients: [{ productCode: 'A', quantities: { 단일: 25 } }],
          sizes: [{ label: '단일', sellingPrice: 1000 }],
        }];
      }
      return [];
    });
    getPriceFiles.mockResolvedValue('bad');

    const result = await getCostAlertData();

    expect(getPriceRowsByFileId).not.toHaveBeenCalled();
    expect(result.items[0]).toMatchObject({
      menuName: '123',
      menuCategory: '기타',
      costRate: 25,
      cost: 250,
      sellingPrice: 1000,
      size: '단일',
    });
  });
});
