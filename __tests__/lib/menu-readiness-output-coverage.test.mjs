import { jest } from '@jest/globals';

const state = {
  prices: [],
  rawValues: [],
  ingredients: [],
  groups: [],
  edges: [],
  toppings: [],
  compositions: [],
  nutritionEdges: [],
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
const getAllNutritionEdges = jest.fn(async () => state.nutritionEdges);
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
  getAllEdges: getAllNutritionEdges,
  toppingNameMatchKey: value =>
    String(value ?? '')
      .replace(/\s+/g, '')
      .toLowerCase(),
}));
jest.unstable_mockModule('@/lib/menu-recipes', () => ({ loadMenuRecipeArrays }));
jest.unstable_mockModule('@/lib/menu-master/recipe-summary', () => ({
  MENU_RECIPE_SUMMARY_STATUS: {
    READY: 'ready',
    MISSING: 'missing',
    NEEDS_PRICE: 'needs-price',
    NEEDS_QUANTITY: 'needs-quantity',
    UNSUPPORTED: 'unsupported',
    EDGE: 'edge',
  },
}));

const { buildMenuReadinessMap } = await import('@/lib/menu-master/readiness');
const { MENU_RECIPE_SUMMARY_STATUS } = await import('@/lib/menu-master/recipe-summary');

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
  state.nutritionEdges = [];
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
    'nutrition_edge_master',
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
    getAllNutritionEdges,
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

  test('메뉴마스터 엣지(카테고리 "엣지") 행은 원산지·알레르기가 "확인 불가"(unknown)로 잡히고, 미작성 처리되지 않는다', async () => {
    // OPT-EDGE 코드로는 원산지/알레르기 출력 row가 절대 생기지 않아, 엣지 행은 그
    // 차원에서 항상 '누락' 오탐이 나던 문제(계획 4단계) — unknown으로 빼야 한다.
    const menus = [{ menuCode: 'OPT-EDGE-002', menuName: '치즈크러스트', category: '엣지' }];
    state.prices = [{ menuCode: 'OPT-EDGE-002', price: 4000 }];
    state.rawValues = [];
    state.nutritionEdges = [{ edgeCode: '치즈크러스트L' }, { edgeCode: '치즈크러스트R' }];

    const map = await buildMenuReadinessMap(menus, new Map());
    const row = map.get('OPT-EDGE-002');

    expect(row.dims.nutrition).toEqual({ status: 'ok', detail: '엣지 기준 영양정보 연동' });
    expect(row.dims.origin.status).toBe('unknown');
    expect(row.dims.allergen.status).toBe('unknown');
    expect(row.overall).not.toBe('missing');
  });

  test('엣지 행은 nutrition_edge_master/raw_values crustType이 없으면 영양성분도 미작성이다', async () => {
    const menus = [{ menuCode: 'OPT-EDGE-003', menuName: '골드스윗', category: '엣지' }];
    state.prices = [{ menuCode: 'OPT-EDGE-003', price: 4000 }];
    state.rawValues = [];
    state.nutritionEdges = [];

    const map = await buildMenuReadinessMap(menus, new Map());
    const row = map.get('OPT-EDGE-003');

    expect(row.dims.nutrition).toEqual({ status: 'missing', detail: '영양성분 값 미입력' });
  });

  test('엣지 관리에 원가 구성이 없는 엣지 행은 "레시피 구성품 없음"이 아니라 엣지 관리로 안내한다', async () => {
    // 실사용 오탐 방지: 메뉴마스터 편집창의 "레시피/원가" 섹션은 엣지 카테고리를 아예
    // 지원하지 않는다("이 카테고리는 레시피 원가를 지원하지 않습니다") — recipe 차원
    // 안내 문구가 "레시피 구성품 없음"이면 사용자가 고칠 수 없는 화면을 가리키게 된다.
    const menus = [{ menuCode: 'OPT-EDGE-003', menuName: '골드스윗', category: '엣지' }];
    state.prices = [{ menuCode: 'OPT-EDGE-003', price: 4000 }];
    const recipeSummaryMap = new Map([
      [
        'OPT-EDGE-003',
        {
          status: MENU_RECIPE_SUMMARY_STATUS.EDGE,
          hasRecipe: false,
          sizeCosts: {},
          totalCost: 0,
        },
      ],
    ]);

    const map = await buildMenuReadinessMap(menus, recipeSummaryMap);
    const row = map.get('OPT-EDGE-003');

    expect(row.dims.recipe).toEqual({
      status: 'missing',
      detail: '엣지 관리(공통 원가 관리)에 원가 구성이 없습니다',
    });
  });
});
