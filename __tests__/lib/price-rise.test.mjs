import { describe, expect, test } from '@jest/globals';
import { findMenuCostRises, diffIngredientUnitPriceRises } from '../../lib/cost/price-rise.js';
import { buildUnitPriceMap } from '../../lib/recipe/index.js';

// 2026-10-30 주임님 요청: 제때 단가나 수동 단가로 원가가 오른 메뉴를 알림·팝업으로 보여 준다.
// 이 파일은 "어떤 메뉴가 얼마나 올랐고 원인이 무엇인지" 계산하는 순수 함수를 검증한다.

const ingredients = [
  {
    id: 1,
    productCode: 'CHEESE',
    ingredientName: '모짜렐라',
    baseQuantity: 1000,
    baseUnitType: 'g',
  },
  { id: 2, productCode: 'BACON', ingredientName: '베이컨', baseQuantity: 1000, baseUnitType: 'g' },
  { id: 3, ingredientName: '수동소스', baseQuantity: 1000, baseUnitType: 'g', priceOverride: 5000 },
];
const priceRows = (cheese, bacon) =>
  new Map([
    ['CHEESE', { productCode: 'CHEESE', priceWithTax: cheese }],
    ['BACON', { productCode: 'BACON', priceWithTax: bacon }],
  ]);

const menus = [
  {
    menuCode: 'P-OR-001-L',
    menuName: '포크 피자 L',
    category: '피자/오리지널',
    price: 20000,
    status: 'active',
  },
  {
    menuCode: 'P-OR-002-L',
    menuName: '베이컨 피자 L',
    category: '피자/오리지널',
    price: 22000,
    status: 'active',
  },
  {
    menuCode: 'P-OR-003-L',
    menuName: '단종 피자 L',
    category: '피자/오리지널',
    price: 20000,
    status: 'discontinued',
  },
];
const comp = (productCode, ingredientName, quantity) => ({
  productCode,
  ingredientName,
  quantity,
  unit: 'g',
});
const recipeMaps = {
  pizza: new Map([
    ['P-OR-001-L', { menuCode: 'P-OR-001-L', components: [comp('CHEESE', '모짜렐라', 100)] }],
    [
      'P-OR-002-L',
      {
        menuCode: 'P-OR-002-L',
        components: [comp('CHEESE', '모짜렐라', 50), comp('BACON', '베이컨', 40)],
      },
    ],
    ['P-OR-003-L', { menuCode: 'P-OR-003-L', components: [comp('CHEESE', '모짜렐라', 100)] }],
  ]),
};

function run(beforeRows, afterRows, beforeIngs = ingredients, afterIngs = ingredients) {
  return findMenuCostRises({
    menus,
    recipeMaps,
    recipeGroups: [],
    beforeMap: buildUnitPriceMap(beforeIngs, beforeRows),
    afterMap: buildUnitPriceMap(afterIngs, afterRows),
  });
}

describe('원가 상승 메뉴 찾기 — 제때 단가', () => {
  const result = run(priceRows(10000, 20000), priceRows(12000, 20000));

  test('치즈 단가가 오르면 치즈를 쓰는 메뉴만 오른 것으로 잡힌다(단종 메뉴·무관한 메뉴 제외)', () => {
    expect(result.items.map(i => i.menuCode)).toEqual(['P-OR-001-L', 'P-OR-002-L']);
  });

  test('원가 이전/이후·상승 금액·상승률이 맞다', () => {
    const [pork, bacon] = result.items;
    expect(pork).toMatchObject({ beforeCost: 1000, afterCost: 1200, costDelta: 200 });
    expect(pork.costDeltaPct).toBeCloseTo(20, 5);
    expect(bacon).toMatchObject({ beforeCost: 1300, afterCost: 1400, costDelta: 100 });
  });

  test('원인 식자재와 그 식자재가 메뉴 원가를 올린 금액을 같이 준다', () => {
    const [pork, bacon] = result.items;
    expect(pork.causes).toEqual([
      expect.objectContaining({
        name: '모짜렐라',
        deltaCost: 200,
        beforeUnitPrice: 10,
        afterUnitPrice: 12,
      }),
    ]);
    // 베이컨은 안 올랐으니 원인에 없다
    expect(bacon.causes.map(c => c.name)).toEqual(['모짜렐라']);
  });

  test('단가가 오른 식자재 목록도 같이 준다', () => {
    expect(result.ingredientRises).toEqual([
      expect.objectContaining({ key: 'CHEESE', beforeUnitPrice: 10, afterUnitPrice: 12 }),
    ]);
  });

  test('상승 금액이 큰 메뉴가 먼저', () => {
    expect(result.items.map(i => i.costDelta)).toEqual([200, 100]);
  });
});

describe('원가 상승 메뉴 찾기 — 오르지 않은 경우', () => {
  test('단가가 내리거나 그대로면 아무것도 안 나온다', () => {
    expect(run(priceRows(10000, 20000), priceRows(9000, 20000)).items).toEqual([]);
    expect(run(priceRows(10000, 20000), priceRows(10000, 20000))).toEqual({
      items: [],
      ingredientRises: [],
    });
  });

  test('1원 미만의 반올림 잡음은 상승으로 치지 않는다', () => {
    // 모짜렐라 100g: 10원 → 10.0004원 (원가 차이 0.0004원)
    expect(run(priceRows(10000, 20000), priceRows(10000.4, 20000)).items).toEqual([]);
  });
});

describe('원가 상승 메뉴 찾기 — 수동 단가', () => {
  test('수동 단가를 올리면 그 식자재를 쓰는 메뉴가 잡힌다(코드 없는 구성품은 이름으로 연결)', () => {
    const manualMenus = [
      {
        menuCode: 'S-001',
        menuName: '소스 사이드',
        category: '사이드',
        price: 5000,
        status: 'active',
      },
    ];
    const sideMaps = {
      side: new Map([['S-001', { menuCode: 'S-001', components: [comp(null, '수동소스', 200)] }]]),
    };
    const afterIngs = ingredients.map(i => (i.id === 3 ? { ...i, priceOverride: 6000 } : i));
    const found = findMenuCostRises({
      menus: manualMenus,
      recipeMaps: sideMaps,
      recipeGroups: [],
      beforeMap: buildUnitPriceMap(ingredients, priceRows(10000, 20000)),
      afterMap: buildUnitPriceMap(afterIngs, priceRows(10000, 20000)),
    });
    expect(found.items).toHaveLength(1);
    expect(found.items[0]).toMatchObject({ menuCode: 'S-001', beforeCost: 1000, afterCost: 1200 });
    expect(found.items[0].causes[0]).toMatchObject({ name: '수동소스', deltaCost: 200 });
    expect(found.ingredientRises[0]).toMatchObject({
      name: '수동소스',
      beforeUnitPrice: 5,
      afterUnitPrice: 6,
    });
  });
});

describe('diffIngredientUnitPriceRises', () => {
  test('단가가 없던 식자재·새 식자재는 상승으로 치지 않는다', () => {
    const before = new Map([['A', { unitPrice: null, ingredientName: 'A' }]]);
    const after = new Map([
      ['A', { unitPrice: 5, ingredientName: 'A' }],
      ['B', { unitPrice: 5, ingredientName: 'B' }],
    ]);
    expect(diffIngredientUnitPriceRises(before, after)).toEqual([]);
  });

  test('Map이 아닌 입력은 빈 목록', () => {
    expect(diffIngredientUnitPriceRises(null, undefined)).toEqual([]);
  });
});
