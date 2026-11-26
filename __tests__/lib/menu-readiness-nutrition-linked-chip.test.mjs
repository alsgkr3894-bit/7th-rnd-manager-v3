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
    'nutrition_edge_master',
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
  getAllMenuRefs: async () => state.menuRefs || [],
  getAllSetCompositions: async () => state.setComps || [],
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

const { buildNutritionLinkedMenuCodeSet, isMenuNutritionLinked } =
  await import('@/lib/menu-master/readiness');

beforeEach(() => {
  state.rawValues = [];
  state.toppings = [];
  state.nutritionEdges = [];
  [
    hasStore,
    getAll,
    getByIndex,
    runTransaction,
    getAllRawValues,
    getAllToppings,
    getAllNutritionEdges,
  ].forEach(fn => fn.mockClear());
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

  test('메뉴마스터 엣지 행(치즈크러스트·골드스윗)은 nutrition_edge_master의 L/R 코드가 모두 있어야 연동된다', async () => {
    state.nutritionEdges = [{ edgeCode: '치즈크러스트L' }, { edgeCode: '치즈크러스트R' }];

    const linked = await buildNutritionLinkedMenuCodeSet();

    expect(
      isMenuNutritionLinked(
        { menuCode: 'OPT-EDGE-002', menuName: '치즈크러스트', category: '엣지' },
        linked
      )
    ).toBe(true);
    // 골드스윗은 L만 있고 R이 없어 아직 미연동이어야 한다.
    state.nutritionEdges.push({ edgeCode: '골드스윗L' });
    const partialLinked = await buildNutritionLinkedMenuCodeSet();
    expect(
      isMenuNutritionLinked(
        { menuCode: 'OPT-EDGE-003', menuName: '골드스윗', category: '엣지' },
        partialLinked
      )
    ).toBe(false);
  });

  test('매장 고정 음료표로 출력되는 음료는 입력값이 없어도 연동이다', async () => {
    state.stores.add('menu_master');
    const drinks = [
      ['D-CC-001-355', '코카콜라355ml'],
      ['D-CZ-001-500', '코카콜라제로500ml'], // 510ml 행으로 출력
      ['D-CZ-001-1250', '코카콜라제로1.25L'],
      ['D-SPR-001-1500', '스프라이트1.5L'],
      ['D-NEW-001-355', '새음료355ml'], // 고정표에 없음
      ['D-SPR-001-750', '스프라이트750ml'], // 없는 용량
    ].map(([menuCode, menuName]) => ({ menuCode, menuName, category: '음료' }));
    getAll.mockImplementation(async name => (name === 'menu_master' ? [...drinks] : []));

    const linked = await buildNutritionLinkedMenuCodeSet();

    expect(drinks.map(menu => isMenuNutritionLinked(menu, linked))).toEqual([
      true,
      true,
      true,
      true,
      false,
      false,
    ]);
    getAll.mockImplementation(async () => []);
  });

  test('세트박스는 구성으로 열량이 계산되는 사이즈만 연동이다', async () => {
    state.stores.add('menu_master');
    state.stores.add('nutrition_set_composition');
    const menus = [
      { menuCode: 'P-OR-001-L', menuName: '치즈 피자 L', category: '피자/오리지널', size: 'L' },
      { menuCode: 'S-001', menuName: '치즈볼', category: '사이드' },
      { menuCode: 'SET-FAM-001-L', menuName: '패밀리박스 L', category: '세트박스', size: 'L' },
      { menuCode: 'SET-FAM-001-R', menuName: '패밀리박스 R', category: '세트박스', size: 'R' },
      { menuCode: 'SET-NEW-001-L', menuName: '새 세트 L', category: '세트박스', size: 'L' },
    ];
    getAll.mockImplementation(async name => (name === 'menu_master' ? [...menus] : []));
    state.rawValues = [
      { menuCode: 'P-OR-001', crustType: '석쇠L', weight: 500, kcal: 250 },
      { menuCode: 'S-001', crustType: '단품', weight: 100, kcal: 300 },
    ];
    state.setComps = ['L', 'R'].map(setSide => ({
      kind: 'set',
      setName: '패밀리박스',
      setSide,
      slots: [{ label: '사이드', menuCodes: ['S-001'] }],
    }));

    const linked = await buildNutritionLinkedMenuCodeSet();

    // R 사이즈 피자 값이 없어 R 세트는 계산되지 않는다. 구성이 없는 세트도 누락이다.
    expect(menus.slice(2).map(menu => isMenuNutritionLinked(menu, linked))).toEqual([
      true,
      false,
      false,
    ]);
    getAll.mockImplementation(async () => []);
    state.setComps = [];
  });

  test('메뉴마스터 엣지 행(석쇠·씬바사삭)은 nutrition_raw_values에 해당 베이스 crustType이 하나라도 있으면 연동된다', async () => {
    state.rawValues = [{ menuCode: 'P-OR-001', crustType: '석쇠L' }];

    const linked = await buildNutritionLinkedMenuCodeSet();

    expect(
      isMenuNutritionLinked(
        { menuCode: 'OPT-EDGE-001', menuName: '석쇠', category: '엣지' },
        linked
      )
    ).toBe(true);
    // 씬바사삭 crustType은 아직 없으므로 미연동.
    expect(
      isMenuNutritionLinked(
        { menuCode: 'OPT-EDGE-004', menuName: '씬바사삭', category: '엣지' },
        linked
      )
    ).toBe(false);
  });
});
