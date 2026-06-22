import { jest } from '@jest/globals';

const state = {
  prices: [],
  rawValues: [],
  ingredients: [],
  groups: [],
  edges: [],
  toppings: [],
  compositions: [],
  recipeArrays: { pizza: [], personal: [], side: [], set: [] },
  stores: new Set([
    'cost_selling_prices',
    'nutrition_raw_values',
    'cost_ingredients',
    'cost_recipe_groups',
    'cost_edge_dough',
    'menu_recipes',
    'nutrition_topping_master',
    'nutrition_pizza_composition',
  ]),
};

const hasStore = jest.fn(storeName => state.stores.has(storeName));
const getAll = jest.fn(async () => []);
const getByIndex = jest.fn(async () => null);
const runTransaction = jest.fn(async () => undefined);
const getAllMenuPrices = jest.fn(async () => state.prices);
const getAllRawValues = jest.fn(async () => state.rawValues);
const getAllIngredients = jest.fn(async () => state.ingredients);
const getAllRecipeGroups = jest.fn(async () => state.groups);
const getAllEdges = jest.fn(async () => state.edges);
const getAllToppings = jest.fn(async () => state.toppings);
const getAllCompositions = jest.fn(async () => state.compositions);
const loadMenuRecipeArrays = jest.fn(async () => state.recipeArrays);

jest.unstable_mockModule('@/lib/db', () => ({
  getAll,
  getByIndex,
  hasStore,
  runTransaction,
}));
jest.unstable_mockModule('@/lib/cost/menu-price/store', () => ({ getAllMenuPrices }));
jest.unstable_mockModule('@/lib/nutrition/values/raw-values', () => ({ getAllRawValues }));
jest.unstable_mockModule('@/lib/ingredient', () => ({ getAllIngredients }));
jest.unstable_mockModule('@/lib/cost/recipe-groups/store', () => ({ getAllRecipeGroups }));
jest.unstable_mockModule('@/lib/cost/edge-dough', () => ({ getAllEdges }));
jest.unstable_mockModule('@/lib/nutrition/values/store', () => ({
  getAllCompositions,
  getAllToppings,
}));
jest.unstable_mockModule('@/lib/menu-recipes', () => ({ loadMenuRecipeArrays }));
jest.unstable_mockModule('@/lib/menu-master/recipe-summary', () => ({
  MENU_RECIPE_SUMMARY_STATUS: {
    READY: 'ready',
    MISSING: 'missing',
    NEEDS_PRICE: 'needs-price',
    NEEDS_QUANTITY: 'needs-quantity',
    UNSUPPORTED: 'unsupported',
  },
}));

const { buildMenuReadinessMap } = await import('@/lib/menu-master/readiness');

function readySummary() {
  return {
    status: 'ready',
    hasRecipe: true,
    missingPriceCount: 0,
    missingQuantityCount: 0,
  };
}

beforeEach(() => {
  state.prices = [{ menuCode: 'S-001', price: 12000 }];
  state.rawValues = [{ menuCode: 'S-001' }];
  state.ingredients = [];
  state.groups = [];
  state.edges = [];
  state.toppings = [];
  state.compositions = [];
  state.recipeArrays = { pizza: [], personal: [], side: [], set: [] };
  state.stores = new Set([
    'cost_selling_prices',
    'nutrition_raw_values',
    'cost_ingredients',
    'cost_recipe_groups',
    'cost_edge_dough',
    'menu_recipes',
    'nutrition_topping_master',
    'nutrition_pizza_composition',
  ]);
  [
    hasStore,
    getAll,
    getByIndex,
    runTransaction,
    getAllMenuPrices,
    getAllRawValues,
    getAllIngredients,
    getAllRecipeGroups,
    getAllEdges,
    getAllToppings,
    getAllCompositions,
    loadMenuRecipeArrays,
  ].forEach(fn => fn.mockClear());
});

describe('menu readiness output coverage', () => {
  test('원산지와 알레르기는 실제 출력 row가 만들어질 때만 완료로 판정한다', async () => {
    const menus = [{ menuCode: 'S-001', menuName: '치즈볼', category: '사이드' }];
    const recipeSummaryMap = new Map([['S-001', readySummary()]]);
    state.ingredients = [
      {
        productCode: 'CHZ',
        ingredientName: '체다치즈',
        origin: [{ displayName: '치즈', country: '미국산' }],
        allergens: ['AL02'],
      },
    ];
    state.recipeArrays.side = [
      {
        menuCode: 'S-001',
        menuName: '치즈볼',
        category: '사이드',
        components: [{ productCode: 'CHZ', ingredientName: '체다치즈' }],
      },
    ];

    const map = await buildMenuReadinessMap(menus, recipeSummaryMap);
    const row = map.get('S-001');

    expect(row.dims.origin).toEqual({ status: 'ok' });
    expect(row.dims.allergen).toEqual({ status: 'ok' });
  });

  test('nutrition 값이 있어도 실제 원산지·알레르기 출력 row가 없으면 미작성으로 남긴다', async () => {
    const menus = [{ menuCode: 'S-001', menuName: '치즈볼', category: '사이드' }];
    const recipeSummaryMap = new Map([['S-001', readySummary()]]);
    state.ingredients = [
      {
        productCode: 'CHZ',
        ingredientName: '체다치즈',
        origin: [],
        allergens: [],
      },
    ];
    state.recipeArrays.side = [
      {
        menuCode: 'S-001',
        menuName: '치즈볼',
        category: '사이드',
        components: [{ productCode: 'CHZ', ingredientName: '체다치즈' }],
      },
    ];

    const map = await buildMenuReadinessMap(menus, recipeSummaryMap);
    const row = map.get('S-001');

    expect(row.dims.nutrition).toEqual({ status: 'ok' });
    expect(row.dims.origin).toEqual({ status: 'missing', detail: '원산지 데이터 없음' });
    expect(row.dims.allergen).toEqual({ status: 'missing', detail: '알레르기 데이터 없음' });
    expect(row.overall).toBe('missing');
  });
});
