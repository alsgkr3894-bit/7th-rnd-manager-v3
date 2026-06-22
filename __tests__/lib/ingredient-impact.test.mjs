import { jest } from '@jest/globals';

const state = {
  recipes: [],
  prices: [],
  menus: [],
  stores: new Set(['menu_recipes', 'cost_selling_prices', 'menu_master']),
};

const getAllMenuRecipes = jest.fn(async () => state.recipes);
const getAllMenuPrices = jest.fn(async () => state.prices);
const getAllMenuMaster = jest.fn(async () => state.menus);
const hasStore = jest.fn(storeName => state.stores.has(storeName));

jest.unstable_mockModule('@/lib/menu-recipes/store', () => ({
  getAllMenuRecipes,
}));

jest.unstable_mockModule('@/lib/cost/menu-price/store', () => ({
  getAllMenuPrices,
}));

jest.unstable_mockModule('@/lib/menu-master', () => ({
  getAllMenuMaster,
}));

jest.unstable_mockModule('@/lib/db', () => ({
  hasStore,
}));

const { computeIngredientPriceImpact } = await import('@/lib/impact/ingredient-impact');

beforeEach(() => {
  state.recipes = [];
  state.prices = [];
  state.menus = [];
  state.stores = new Set(['menu_recipes', 'cost_selling_prices', 'menu_master']);
  getAllMenuRecipes.mockClear();
  getAllMenuPrices.mockClear();
  getAllMenuMaster.mockClear();
  hasStore.mockClear();
});

describe('ingredient impact preview', () => {
  test('포장가와 기준수량으로 계산한 단위단가 변화가 메뉴 원가율에 반영된다', async () => {
    state.recipes = [
      {
        menuCode: 'PZ-001',
        components: [
          { productCode: 'CHEESE', quantity: 100 },
          { productCode: 'SAUCE', quantity: 50, unitPrice: 2 },
        ],
      },
    ];
    state.prices = [{ menuCode: 'PZ-001', price: 20000 }];
    state.menus = [{ menuCode: 'PZ-001', menuName: '치즈피자' }];

    const result = await computeIngredientPriceImpact('CHEESE', 10000, 12000, {
      oldBaseQuantity: 1000,
      newBaseQuantity: 1000,
    });

    expect(result.oldUnitPrice).toBe(10);
    expect(result.newUnitPrice).toBe(12);
    expect(result.priceDelta).toBe(2000);
    expect(result.unitPriceDelta).toBe(2);
    expect(result.totalAffected).toBe(1);
    expect(result.affectedMenus[0]).toMatchObject({
      menuCode: 'PZ-001',
      menuName: '치즈피자',
      componentCount: 1,
      sellingPrice: 20000,
    });
    expect(result.affectedMenus[0].oldCostRate).toBeCloseTo(5.5);
    expect(result.affectedMenus[0].newCostRate).toBeCloseTo(6.5);
    expect(result.affectedMenus[0].delta).toBeCloseTo(1);
  });

  test('포장가는 같아도 기준수량이 바뀌면 단위단가 변화로 계산한다', async () => {
    state.recipes = [
      {
        menuCode: 'PZ-002',
        components: [{ productCode: 'CHEESE', quantity: 10 }],
      },
    ];
    state.prices = [{ menuCode: 'PZ-002', price: 10000 }];

    const result = await computeIngredientPriceImpact('CHEESE', 1234, 1234, {
      oldBaseQuantity: 100,
      newBaseQuantity: 50,
    });

    expect(result.oldUnitPrice).toBe(12.3);
    expect(result.newUnitPrice).toBe(24.7);
    expect(result.priceDelta).toBe(0);
    expect(result.unitPriceDelta).toBeCloseTo(12.4);
    expect(result.affectedMenus[0].oldCostRate).toBeCloseTo(1.23);
    expect(result.affectedMenus[0].newCostRate).toBeCloseTo(2.47);
  });

  test('기준수량이 없으면 잘못된 0원 영향도를 만들지 않는다', async () => {
    state.recipes = [
      {
        menuCode: 'PZ-003',
        components: [{ productCode: 'CHEESE', quantity: 10 }],
      },
    ];

    const result = await computeIngredientPriceImpact('CHEESE', 10000, 12000, {
      oldBaseQuantity: null,
      newBaseQuantity: 1000,
    });

    expect(result.totalAffected).toBe(0);
    expect(result.affectedMenus).toEqual([]);
    expect(result.oldUnitPrice).toBeNull();
    expect(result.newUnitPrice).toBe(12);
    expect(getAllMenuRecipes).not.toHaveBeenCalled();
  });
});
