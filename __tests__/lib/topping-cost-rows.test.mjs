import { describe, expect, test } from '@jest/globals';
import {
  buildToppingCostRows,
  buildToppingMenuPatch,
  buildToppingRecipePatch,
  filterToppingMenus,
  toppingComponentChangesForIngredient,
} from '@/lib/cost/topping/rows';
import { buildUnitPriceMap } from '@/lib/recipe';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const menus = [
  { id: 1, menuCode: 'T-ETC-002', menuName: '치즈 80g', category: '추가토핑', price: 2000 },
  { id: 2, menuCode: 'T-ETC-001', menuName: '아직 미입력', category: '추가토핑', price: null },
  {
    id: 3,
    menuCode: 'T-ETC-003',
    menuName: '단종된 토핑',
    category: '추가토핑',
    status: 'discontinued',
  },
  { id: 4, menuCode: 'P-PS-001-L', menuName: '피자', category: '피자', price: 30000 },
];

const recipeMap = new Map([
  [
    'T-ETC-002',
    { components: [{ productCode: 'CHZ', ingredientName: '체다치즈', quantity: 80, unit: 'g' }] },
  ],
]);

const unitPriceMap = new Map([['CHZ', { unitPrice: 10 }]]);

describe('filterToppingMenus', () => {
  test('추가토핑 카테고리이면서 단종되지 않은 메뉴만 남긴다', () => {
    const filtered = filterToppingMenus(menus);
    expect(filtered.map(m => m.menuCode).sort()).toEqual(['T-ETC-001', 'T-ETC-002']);
  });
});

describe('buildToppingCostRows', () => {
  test('레시피가 있는 토핑은 원가·원가율을 계산한다', () => {
    const rows = buildToppingCostRows({ menus, recipeMap, unitPriceMap });
    const cheese = rows.find(r => r.menuCode === 'T-ETC-002');

    expect(cheese.cost).toBe(800); // 80 * 10
    expect(cheese.costRate).toBe(40); // 800/2000*100
    expect(cheese.unitPrice).toBe(10);
    expect(cheese.multiComponent).toBe(false);
  });

  test('레시피가 없는 토핑은 원가 0·원가율 null', () => {
    const rows = buildToppingCostRows({ menus, recipeMap, unitPriceMap });
    const empty = rows.find(r => r.menuCode === 'T-ETC-001');

    expect(empty.cost).toBe(0);
    expect(empty.costRate).toBeNull();
    expect(empty.component).toBeNull();
  });

  test('판매가가 없으면 원가가 있어도 원가율은 null', () => {
    const rows = buildToppingCostRows({
      menus: [{ id: 5, menuCode: 'T-ETC-005', menuName: '가격없음', category: '추가토핑' }],
      recipeMap: new Map([['T-ETC-005', { components: [{ productCode: 'CHZ', quantity: 80 }] }]]),
      unitPriceMap,
    });
    expect(rows[0].cost).toBe(800);
    expect(rows[0].costRate).toBeNull();
  });

  test('구성품이 2개 이상이면 첫 번째만 쓰고 multiComponent:true로 표시한다', () => {
    const rows = buildToppingCostRows({
      menus: [
        { id: 6, menuCode: 'T-ETC-006', menuName: '복합토핑', category: '추가토핑', price: 1000 },
      ],
      recipeMap: new Map([
        [
          'T-ETC-006',
          {
            components: [
              { productCode: 'CHZ', quantity: 50 },
              { productCode: 'PEP', quantity: 20 },
            ],
          },
        ],
      ]),
      unitPriceMap: new Map([
        ['CHZ', { unitPrice: 10 }],
        ['PEP', { unitPrice: 20 }],
      ]),
    });

    expect(rows[0].multiComponent).toBe(true);
    expect(rows[0].component.productCode).toBe('CHZ');
    expect(rows[0].cost).toBe(500); // 첫 구성품(치즈)만 반영 — 50*10
  });
});

describe('buildToppingMenuPatch / buildToppingRecipePatch', () => {
  const row = {
    id: 1,
    menuCode: 'T-ETC-002',
    menuName: '치즈 80g',
    price: 2000,
    status: 'active',
    component: { productCode: 'CHZ', ingredientName: '체다치즈', quantity: 80, unit: 'g' },
  };

  test('menu_master 패치는 size:null(단일 규격 관례)로 만든다', () => {
    const patch = buildToppingMenuPatch(row, { price: 2500 });
    expect(patch).toMatchObject({
      id: 1,
      menuCode: 'T-ETC-002',
      category: '추가토핑',
      size: null,
      price: 2500,
    });
  });

  test('menu_recipes 패치는 size:"단일"(레시피 관례)로 만든다', () => {
    const patch = buildToppingRecipePatch(row, { quantity: 100 });
    expect(patch).toMatchObject({
      menuCode: 'T-ETC-002',
      category: '추가토핑',
      kind: 'topping',
      size: '단일',
    });
    expect(patch.components).toEqual([
      { productCode: 'CHZ', ingredientName: '체다치즈', quantity: 100, unit: 'g' },
    ]);
  });

  test('변경분을 안 주면 기존 행 값을 그대로 유지한다', () => {
    const patch = buildToppingRecipePatch(row, {});
    expect(patch.components[0]).toEqual(row.component);
  });
});

/**
 * 추가토핑 원가표도 엣지 관리와 같은 결함이 있었다(2026-09-29): 식자재를 고를 때 제품코드로만
 * 연결해서 제품코드 없는 수동 식자재는 단가를 못 가져오고, 구성품을 다시 저장할 때 unitPrice가
 * 버려져 원가가 사라졌다. 실데이터: 양파(id 107)·청피망(id 108) 토핑이 코드 없이 연결돼 있다.
 */
describe('추가토핑 — 제품코드 없는 수동 식자재', () => {
  const allIngredients = [
    {
      id: 107,
      ingredientName: '양파',
      productCode: null,
      baseQuantity: 12750,
      baseUnitType: 'g',
      priceOverride: 12180,
    },
    {
      id: 49,
      ingredientName: '양송이 버섯',
      productCode: 'CC320908',
      baseQuantity: 1000,
      baseUnitType: 'g',
    },
    {
      id: 200,
      ingredientName: '중복',
      productCode: null,
      baseQuantity: 1000,
      baseUnitType: 'g',
      priceOverride: 1000,
    },
    {
      id: 201,
      ingredientName: '중복',
      productCode: null,
      baseQuantity: 1000,
      baseUnitType: 'g',
      priceOverride: 2000,
    },
  ];
  const upm = buildUnitPriceMap(allIngredients, new Map([['CC320908', { priceWithTax: 5200 }]]));
  const menus = [
    {
      id: 1,
      menuCode: 'T-ETC-008',
      menuName: '양파 100g',
      category: '추가토핑',
      price: 1000,
      status: 'active',
    },
  ];
  const codeless = {
    ingredientName: '양파',
    productCode: null,
    quantity: 100,
    unit: 'g',
    unitPrice: 1,
  };
  const recipeMap = new Map([['T-ETC-008', { components: [codeless] }]]);

  test('식자재를 고를 때 제품코드가 없으면 id 키로 연결하고 단위를 채운다', () => {
    expect(toppingComponentChangesForIngredient(allIngredients[0], upm)).toEqual({
      productCode: '107',
      ingredientName: '양파',
      unit: 'g',
    });
    expect(toppingComponentChangesForIngredient(allIngredients[1], upm).productCode).toBe(
      'CC320908'
    );
    // 단가는 저장하지 않는다 — 화면이 unitPriceMap에서 실시간 계산
    expect(toppingComponentChangesForIngredient(allIngredients[0], upm)).not.toHaveProperty(
      'unitPrice'
    );
  });

  test('id 키로 연결하면 최신 단가로 원가가 계산된다', () => {
    const linked = { ...codeless, productCode: '107', unitPrice: undefined };
    const [row] = buildToppingCostRows({
      menus,
      recipeMap: new Map([['T-ETC-008', { components: [linked] }]]),
      unitPriceMap: upm,
    });
    expect(row.unitPrice).toBe(upm.get('107').unitPrice);
    expect(row.cost).toBeGreaterThan(0);
  });

  test('코드 빈 옛 구성품은 이름으로 식자재를 찾아 단가를 실시간으로 쓴다(저장은 하지 않는다)', () => {
    const [row] = buildToppingCostRows({ menus, recipeMap, unitPriceMap: upm, allIngredients });
    expect(row.linkedProductCode).toBe('107');
    expect(row.unitPrice).toBe(upm.get('107').unitPrice);
    expect(row.component.productCode).toBeNull(); // 원본 구성품은 그대로
  });

  test('이름이 겹치면(모호) 연결하지 않고 저장된 단가를 그대로 쓴다', () => {
    const ambiguous = new Map([
      [
        'T-ETC-008',
        {
          components: [
            { ingredientName: '중복', productCode: null, quantity: 1, unit: 'g', unitPrice: 7 },
          ],
        },
      ],
    ]);
    const [row] = buildToppingCostRows({
      menus,
      recipeMap: ambiguous,
      unitPriceMap: upm,
      allIngredients,
    });
    expect(row.linkedProductCode).toBeNull();
    expect(row.unitPrice).toBe(7);
  });

  test('allIngredients를 안 주면 종전 동작 그대로', () => {
    const [row] = buildToppingCostRows({ menus, recipeMap, unitPriceMap: upm });
    expect(row.linkedProductCode).toBeNull();
    expect(row.unitPrice).toBe(1);
  });

  test('수량만 고쳐 저장해도 기존 단가가 버려지지 않고, 이름으로 찾은 연결 키가 함께 저장된다', () => {
    const [row] = buildToppingCostRows({ menus, recipeMap, unitPriceMap: upm, allIngredients });
    const patch = buildToppingRecipePatch(row, { quantity: 120 });
    expect(patch.components[0]).toMatchObject({ productCode: '107', quantity: 120, unitPrice: 1 });
  });

  test('새 식자재를 고르면 낡은 단가를 끌고 가지 않는다', () => {
    const [row] = buildToppingCostRows({ menus, recipeMap, unitPriceMap: upm, allIngredients });
    const patch = buildToppingRecipePatch(
      row,
      toppingComponentChangesForIngredient(allIngredients[1], upm)
    );
    expect(patch.components[0].productCode).toBe('CC320908');
    expect(patch.components[0]).not.toHaveProperty('unitPrice');
  });

  test('이미 제품코드가 있는 구성품은 연결 키로 덮지 않는다', () => {
    const coded = new Map([
      [
        'T-ETC-008',
        {
          components: [
            { ingredientName: '양송이 버섯', productCode: 'CC320908', quantity: 50, unit: 'g' },
          ],
        },
      ],
    ]);
    const [row] = buildToppingCostRows({
      menus,
      recipeMap: coded,
      unitPriceMap: upm,
      allIngredients,
    });
    expect(row.linkedProductCode).toBeNull();
    expect(buildToppingRecipePatch(row, { quantity: 60 }).components[0].productCode).toBe(
      'CC320908'
    );
  });
});

describe('추가토핑 화면 연결', () => {
  const src = f => readFileSync(resolve(f), 'utf8');
  test('표는 헬퍼로 식자재를 연결하고, 페이지는 식자재 목록을 행 조립에 넘긴다', () => {
    const table = src('components/cost/topping/ToppingCostTable.jsx');
    expect(table).toContain('toppingComponentChangesForIngredient(meta, unitPriceMap)');
    expect(table).not.toContain('unitPriceMap.get(meta.productCode)');
    expect(src('app/cost/topping/page.jsx')).toContain('allIngredients: data.ingredients');
  });
});
