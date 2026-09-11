import { describe, expect, test } from '@jest/globals';
import {
  buildToppingCostRows,
  buildToppingMenuPatch,
  buildToppingRecipePatch,
  filterToppingMenus,
} from '@/lib/cost/topping/rows';

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
