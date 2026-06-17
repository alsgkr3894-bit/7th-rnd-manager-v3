import { describe, expect, test } from '@jest/globals';
import {
  buildMenuRecipeSummaryMap,
  recipeKindForMenu,
} from '../../lib/menu-master/recipe-summary.js';
import { mergeCanonicalRecipeMaps } from '../../lib/menu-recipes/legacy.js';
import { buildDetailRows } from '../../lib/cost/margin/build-rows.js';
import { MENU_RECIPE_SUMMARY_STATUS } from '../../lib/menu-master/recipe-summary.js';

// ──────────────────────────────────────────────
// 1. 카테고리 라우팅 커버리지
// ──────────────────────────────────────────────
describe('카테고리별 레시피 저장소 라우팅', () => {
  test('소스·파스타·사이드·음료는 side로 라우팅된다', () => {
    expect(recipeKindForMenu({ category: '소스' })).toBe('side');
    expect(recipeKindForMenu({ category: '파스타' })).toBe('side');
    expect(recipeKindForMenu({ category: '사이드' })).toBe('side');
    expect(recipeKindForMenu({ category: '음료' })).toBe('side');
  });

  test('세트박스는 set으로 라우팅된다', () => {
    expect(recipeKindForMenu({ category: '세트박스' })).toBe('set');
  });

  test('피자 서브카테고리는 pizza로 라우팅된다', () => {
    expect(recipeKindForMenu({ category: '피자' })).toBe('pizza');
    expect(recipeKindForMenu({ category: '피자/오리지널' })).toBe('pizza');
    expect(recipeKindForMenu({ category: '피자/프리미엄' })).toBe('pizza');
    expect(recipeKindForMenu({ category: '피자/하프앤하프' })).toBe('pizza');
  });

  test('1인피자는 personal로 라우팅된다', () => {
    expect(recipeKindForMenu({ category: '1인피자' })).toBe('personal');
  });

  test('지원하지 않는 카테고리는 null을 반환한다', () => {
    expect(recipeKindForMenu({ category: '엣지' })).toBeNull();
    expect(recipeKindForMenu({ category: '추가토핑' })).toBeNull();
  });
});

// ──────────────────────────────────────────────
// 2. mergeCanonicalRecipeMaps — 소스 카테고리 레시피를 maps.side에 넣는지
// ──────────────────────────────────────────────
describe('mergeCanonicalRecipeMaps — 소스 카테고리', () => {
  test('소스 카테고리 레시피가 maps.side에 들어간다', () => {
    const maps = mergeCanonicalRecipeMaps([
      {
        menuCode: 'SC-001',
        menuName: '마리나라소스',
        category: '소스',
        kind: 'side',
        components: [{ ingredientName: '토마토', quantity: 100 }],
      },
    ]);

    expect(maps.side).toBeInstanceOf(Map);
    expect(maps.side.has('SC-001')).toBe(true);
    expect(maps.side.get('SC-001').menuName).toBe('마리나라소스');
    expect(maps.pizza.has('SC-001')).toBe(false);
  });

  test('파스타 카테고리 레시피가 maps.side에 들어간다', () => {
    const maps = mergeCanonicalRecipeMaps([
      {
        menuCode: 'PA-001',
        menuName: '크림파스타',
        category: '파스타',
        kind: 'side',
        components: [{ ingredientName: '면', quantity: 200 }],
      },
    ]);

    expect(maps.side.has('PA-001')).toBe(true);
  });
});

// ──────────────────────────────────────────────
// 3. buildMenuRecipeSummaryMap — 소스 카테고리가 side 맵에서 원가를 가져온다
// ──────────────────────────────────────────────
describe('buildMenuRecipeSummaryMap — 소스 카테고리 원가 반영', () => {
  test('소스 메뉴가 side recipeMaps에서 원가를 가져온다', () => {
    const unitPriceMap = new Map([['TOM', { unitPrice: 5, baseUnitType: 'g' }]]);

    const result = buildMenuRecipeSummaryMap(
      [{ menuCode: 'SC-001', category: '소스', price: 2000 }],
      {
        side: new Map([
          [
            'SC-001',
            {
              menuCode: 'SC-001',
              category: '소스',
              kind: 'side',
              components: [{ productCode: 'TOM', ingredientName: '토마토', quantity: 100 }],
            },
          ],
        ]),
      },
      unitPriceMap
    );

    const summary = result.get('SC-001');
    expect(summary).toBeDefined();
    expect(summary.status).toBe(MENU_RECIPE_SUMMARY_STATUS.READY);
    expect(summary.hasRecipe).toBe(true);
    expect(summary.totalCost).toBe(500);
    expect(summary.costRate).toBe(25);
  });

  test('레시피 없는 소스 메뉴는 MISSING 상태다', () => {
    const result = buildMenuRecipeSummaryMap(
      [{ menuCode: 'SC-002', category: '소스', price: 1500 }],
      { side: new Map() },
      new Map()
    );

    const summary = result.get('SC-002');
    expect(summary.status).toBe(MENU_RECIPE_SUMMARY_STATUS.MISSING);
    expect(summary.hasRecipe).toBe(false);
  });
});

// ──────────────────────────────────────────────
// 4. buildDetailRows — 소스 카테고리가 sideMap으로 라우팅된다
// ──────────────────────────────────────────────
describe('buildDetailRows — 소스 카테고리 sideMap 라우팅', () => {
  test('소스 카테고리 메뉴가 sideMap에서 레시피를 참조한다', () => {
    const unitPriceMap = new Map([['TOM', { unitPrice: 5, baseUnitType: 'g' }]]);
    const sideMap = new Map([
      [
        'SC-001',
        {
          menuCode: 'SC-001',
          category: '소스',
          components: [{ productCode: 'TOM', ingredientName: '토마토', quantity: 100 }],
        },
      ],
    ]);

    const rows = buildDetailRows(
      [{ menuCode: 'SC-001', menuName: '마리나라소스', category: '소스', price: 2000 }],
      {
        pizzaMap: new Map(),
        personalMap: new Map(),
        sideMap,
        setMap: new Map(),
      },
      unitPriceMap
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].menuName).toBe('마리나라소스');
    expect(rows[0].menuCategory).toBe('소스');
    // 단일 사이즈이므로 costMap에 undefined 키(size=undefined)로 저장됨
    const costValues = Object.values(rows[0].costMap);
    expect(costValues).toHaveLength(1);
    expect(costValues[0]).toBe(500);
  });

  test('사이드·음료·엣지 카테고리도 sideMap으로 라우팅된다', () => {
    const sideMap = new Map([
      ['SD-001', { menuCode: 'SD-001', components: [] }],
      ['BV-001', { menuCode: 'BV-001', components: [] }],
    ]);

    const allMenuPrices = [
      { menuCode: 'SD-001', menuName: '감자튀김', category: '사이드', price: 2500 },
      { menuCode: 'BV-001', menuName: '콜라', category: '음료', price: 1500 },
      { menuCode: 'ET-999', menuName: '크런치', category: '엣지', price: 500 },
    ];

    const rows = buildDetailRows(
      allMenuPrices,
      { pizzaMap: new Map(), personalMap: new Map(), sideMap, setMap: new Map() },
      new Map()
    );

    const categories = rows.map(r => r.menuCategory);
    expect(categories).toContain('사이드');
    expect(categories).toContain('음료');
    expect(categories).toContain('엣지');
  });
});
