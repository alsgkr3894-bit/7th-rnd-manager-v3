import { jest } from '@jest/globals';

/**
 * 메뉴마스터 목록의 "영양 연동/누락" 칩(buildNutritionLinkedMenuCodeSet/isMenuNutritionLinked)이
 * 메뉴 수정 모달의 "영양성분 출력 미리보기"(lib/nutrition/label/menu-preview.js)와 같은 기준으로
 * 판정하는지 확인한다 — 특히 추가토핑은 nutrition_topping_master를 코드가 아니라 이름으로
 * 매칭하므로, 칩도 이름 매칭을 인정하지 않으면 "누락" 칩인데 미리보기엔 값이 나오는
 * 모순이 생긴다(실사용 검증 중 발견).
 *
 * 모킹 세트는 __tests__/lib/menu-readiness-output-coverage.test.mjs와 동일하다 —
 * readiness.js 한 파일에서 함께 export되므로 어느 함수를 쓰든 모듈 전체 import chain을
 * 안전하게 만들어야 한다.
 */
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
  },
}));

const { buildNutritionLinkedMenuCodeSet, isMenuNutritionLinked } =
  await import('@/lib/menu-master/readiness');

beforeEach(() => {
  state.rawValues = [];
  state.toppings = [];
  [hasStore, getAll, getByIndex, runTransaction, getAllRawValues, getAllToppings].forEach(fn =>
    fn.mockClear()
  );
});

describe('buildNutritionLinkedMenuCodeSet / isMenuNutritionLinked', () => {
  test('nutrition_raw_values의 base 코드로 연동된 일반 메뉴를 인식한다', async () => {
    state.rawValues = [{ menuCode: 'P-PS-001' }];

    const linked = await buildNutritionLinkedMenuCodeSet();

    expect(
      isMenuNutritionLinked({ menuCode: 'P-PS-001-L', menuName: '샘스테이크 피자' }, linked)
    ).toBe(true);
    expect(isMenuNutritionLinked({ menuCode: 'P-PS-999-L', menuName: '등록 안 됨' }, linked)).toBe(
      false
    );
  });

  test('추가토핑은 nutrition_topping_master의 이름 매칭으로도 연동을 인정한다', async () => {
    state.toppings = [{ toppingCode: 'ET-001', toppingName: '치즈 80g' }];

    const linked = await buildNutritionLinkedMenuCodeSet();

    // menu_master의 T-ETC-002 코드는 토핑마스터의 ET-001과 다르지만, 이름이 같으면
    // 실제 출력 미리보기(buildMenuNutritionPreview)와 같은 규칙으로 연동을 인정해야 한다.
    expect(isMenuNutritionLinked({ menuCode: 'T-ETC-002', menuName: '치즈 80g' }, linked)).toBe(
      true
    );
    expect(
      isMenuNutritionLinked({ menuCode: 'T-ETC-099', menuName: '아직 안 만든 토핑' }, linked)
    ).toBe(false);
  });

  test('추가토핑 이름 매칭은 공백 위치·대소문자 차이를 무시한다 (실사용 오탐 재현)', async () => {
    // 메뉴마스터와 영양 토핑 마스터는 서로 다른 화면에서 입력돼 공백이 자주 어긋난다.
    state.toppings = [{ toppingCode: 'ET-004', toppingName: '블랙올리브32개 (32g)' }];

    const linked = await buildNutritionLinkedMenuCodeSet();

    expect(
      isMenuNutritionLinked({ menuCode: 'T-ETC-004', menuName: '블랙올리브 32개(32g)' }, linked)
    ).toBe(true);
  });

  test('토핑 편집 화면에서 메뉴마스터 코드를 직접 연결하면 이름이 달라도 연동을 인정한다', async () => {
    state.toppings = [
      { toppingCode: 'ET-001', toppingName: '까망베르 치즈', menuCode: 'T-ETC-001' },
    ];

    const linked = await buildNutritionLinkedMenuCodeSet();

    expect(isMenuNutritionLinked({ menuCode: 'T-ETC-001', menuName: '치즈 100g' }, linked)).toBe(
      true
    );
  });
});
