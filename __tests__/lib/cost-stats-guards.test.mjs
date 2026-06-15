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
      const priceWithTax =
        priceRowMap.get(meta.productCode)?.priceWithTax ?? meta.priceOverride ?? null;
      map.set(meta.productCode, {
        unitPrice:
          meta.baseQuantity > 0 && priceWithTax != null ? priceWithTax / meta.baseQuantity : null,
      });
    }
    return map;
  },
  calcMarginRate: (cost, sellingPrice) => (sellingPrice > 0 ? (cost / sellingPrice) * 100 : null),
}));

const { getCostAlertData } = await import('../../lib/stats/cost-stats.js');

beforeEach(() => {
  jest.clearAllMocks();
  hasStore.mockReturnValue(true);
  getAll.mockImplementation(async storeName => {
    if (storeName === 'cost_ingredients') return [];
    if (storeName === 'menu_recipes') return [];
    if (storeName === 'cost_selling_prices') return [];
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
      if (storeName === 'menu_recipes') {
        return [
          null,
          'bad',
          {
            menuCode: 'P-001-L',
            menuName: '치즈피자',
            category: '피자',
            size: 'L',
            components: [{ productCode: 'A', quantity: 50 }],
          },
          {
            menuName: '깨진 레시피',
            components: 'bad',
          },
          {
            menuName: '판매가 없는 레시피',
            components: [{ productCode: 'A', quantity: 50 }],
          },
        ];
      }
      if (storeName === 'cost_selling_prices') {
        return [null, 'bad', { menuCode: 'P-001-L', menuName: '치즈피자', size: 'L', price: 2000 }];
      }
      return [];
    });
    getPriceFiles.mockResolvedValue([{ id: 3 }, null]);
    getPriceRowsByFileId.mockResolvedValue([null, 'bad', { productCode: 'A', priceWithTax: 2000 }]);

    const result = await getCostAlertData();

    expect(result).toEqual({
      items: [
        {
          menuName: '치즈피자',
          menuCategory: '피자',
          menuCode: 'P-001-L',
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
        return [
          { productCode: 'A', ingredientName: '치즈', baseQuantity: 100, priceOverride: 1000 },
        ];
      }
      if (storeName === 'menu_recipes') {
        return [
          {
            menuCode: 'S-001',
            menuName: 123,
            components: [{ productCode: 'A', quantity: 25 }],
            size: '단일',
          },
        ];
      }
      if (storeName === 'cost_selling_prices') {
        return [{ menuCode: 'S-001', menuName: '123', size: '단일', price: 1000 }];
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
