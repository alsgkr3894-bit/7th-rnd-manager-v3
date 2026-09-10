import { describe, expect, test } from '@jest/globals';
import {
  buildMenuCostMap,
  buildPriceRowMap,
  diffMenuCostMaps,
} from '../../lib/cost/history/price-file-cost.js';

const ingredients = [{ productCode: 'CHZ', ingredientName: '치즈', baseQuantity: 100 }];
const recipeMaps = {
  pizza: new Map([
    [
      'P-001',
      {
        menuCode: 'P-001',
        components: [{ productCode: 'CHZ', ingredientName: '치즈', quantity: 50 }],
      },
    ],
  ]),
};
const menus = [{ menuCode: 'P-001', menuName: '테스트피자', category: '피자', price: 2000 }];

describe('buildPriceRowMap', () => {
  test('productCode 기준 Map을 만들고 priceWithTax가 없는 행은 건너뛴다', () => {
    const map = buildPriceRowMap([
      { productCode: 'CHZ', priceWithTax: 1000 },
      { productCode: 'NO-PRICE' },
      { priceWithTax: 500 }, // productCode 없음
    ]);
    expect(map.size).toBe(1);
    expect(map.get('CHZ')).toEqual({ productCode: 'CHZ', priceWithTax: 1000 });
  });
});

describe('buildMenuCostMap', () => {
  test('레시피가 있는 메뉴만 그 시점 단가로 원가·원가율을 계산한다', () => {
    const priceRowMap = buildPriceRowMap([{ productCode: 'CHZ', priceWithTax: 1000 }]);
    const costMap = buildMenuCostMap({ menus, recipeMaps, priceRowMap, ingredients });

    expect(costMap.size).toBe(1);
    const entry = costMap.get('P-001');
    // unitPrice = 1000/100 = 10, cost = 50 * 10 = 500
    expect(entry.totalCost).toBe(500);
    expect(entry.costRate).toBe(25); // 500/2000*100
    expect(entry.sellingPrice).toBe(2000);
  });

  test('레시피가 없는 메뉴는 결과에서 제외한다', () => {
    const priceRowMap = buildPriceRowMap([{ productCode: 'CHZ', priceWithTax: 1000 }]);
    const noRecipeMenus = [{ menuCode: 'P-999', menuName: '레시피없음', category: '피자' }];
    const costMap = buildMenuCostMap({
      menus: noRecipeMenus,
      recipeMaps,
      priceRowMap,
      ingredients,
    });
    expect(costMap.size).toBe(0);
  });
});

describe('diffMenuCostMaps', () => {
  test('단가가 오르면 costDelta·costDeltaPct·costRateDelta가 모두 양수로 계산된다', () => {
    const before = buildMenuCostMap({
      menus,
      recipeMaps,
      priceRowMap: buildPriceRowMap([{ productCode: 'CHZ', priceWithTax: 1000 }]),
      ingredients,
    });
    const after = buildMenuCostMap({
      menus,
      recipeMaps,
      priceRowMap: buildPriceRowMap([{ productCode: 'CHZ', priceWithTax: 2000 }]),
      ingredients,
    });

    const diffs = diffMenuCostMaps(before, after);
    expect(diffs).toHaveLength(1);
    const [d] = diffs;
    expect(d.menuCode).toBe('P-001');
    expect(d.beforeCost).toBe(500);
    expect(d.afterCost).toBe(1000);
    expect(d.costDelta).toBe(500);
    expect(d.costDeltaPct).toBe(100);
    expect(d.beforeCostRate).toBe(25);
    expect(d.afterCostRate).toBe(50);
    expect(d.costRateDelta).toBe(25);
  });

  test('minDeltaAbs 미만의 변동은 잡음으로 보고 제외한다', () => {
    const before = buildMenuCostMap({
      menus,
      recipeMaps,
      priceRowMap: buildPriceRowMap([{ productCode: 'CHZ', priceWithTax: 1000 }]),
      ingredients,
    });
    // 아주 미세하게만 오른 경우
    const after = buildMenuCostMap({
      menus,
      recipeMaps,
      priceRowMap: buildPriceRowMap([{ productCode: 'CHZ', priceWithTax: 1000.5 }]),
      ingredients,
    });

    expect(diffMenuCostMaps(before, after, { minDeltaAbs: 1 })).toHaveLength(0);
  });

  test('변동이 없으면(같은 단가) 결과가 비어 있다', () => {
    const same = buildMenuCostMap({
      menus,
      recipeMaps,
      priceRowMap: buildPriceRowMap([{ productCode: 'CHZ', priceWithTax: 1000 }]),
      ingredients,
    });
    expect(diffMenuCostMaps(same, same)).toHaveLength(0);
  });

  test('판매가가 없는 메뉴는 costRate가 null이고, |costDeltaPct| 내림차순으로 정렬한다', () => {
    const ingredients2 = [
      { productCode: 'CHZ', ingredientName: '치즈', baseQuantity: 100 },
      { productCode: 'DOE', ingredientName: '도우', baseQuantity: 100 },
    ];
    const noPriceMenus = [
      { menuCode: 'P-001', menuName: '가격없음(변동 100%)', category: '피자' },
      { menuCode: 'P-002', menuName: '많이변동(변동 400%)', category: '피자', price: 2000 },
    ];
    const recipeMaps2 = {
      pizza: new Map([
        ['P-001', { menuCode: 'P-001', components: [{ productCode: 'CHZ', quantity: 50 }] }],
        ['P-002', { menuCode: 'P-002', components: [{ productCode: 'DOE', quantity: 50 }] }],
      ]),
    };
    const before = buildMenuCostMap({
      menus: noPriceMenus,
      recipeMaps: recipeMaps2,
      priceRowMap: buildPriceRowMap([
        { productCode: 'CHZ', priceWithTax: 1000 },
        { productCode: 'DOE', priceWithTax: 1000 },
      ]),
      ingredients: ingredients2,
    });
    const after = buildMenuCostMap({
      menus: noPriceMenus,
      recipeMaps: recipeMaps2,
      priceRowMap: buildPriceRowMap([
        { productCode: 'CHZ', priceWithTax: 2000 }, // +100%
        { productCode: 'DOE', priceWithTax: 5000 }, // +400%
      ]),
      ingredients: ingredients2,
    });

    const diffs = diffMenuCostMaps(before, after);
    expect(diffs).toHaveLength(2);
    expect(diffs[0].menuCode).toBe('P-002');
    expect(diffs[0].costDeltaPct).toBeCloseTo(400);
    expect(diffs[1].menuCode).toBe('P-001');
    expect(diffs[1].costDeltaPct).toBeCloseTo(100);
    const p001 = diffs.find(d => d.menuCode === 'P-001');
    expect(p001.beforeCostRate).toBeNull();
    expect(p001.afterCostRate).toBeNull();
    expect(p001.costRateDelta).toBeNull();
  });
});
