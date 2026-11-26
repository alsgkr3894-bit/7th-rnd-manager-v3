import { describe, expect, test } from '@jest/globals';
import {
  checkMenuValues,
  diffBaseline,
  manualMenuCost,
  packPriceOf,
  pickRepresentatives,
} from '../../scripts/cost-baseline-core.mjs';

// 2026-11-26 점검 0단계 3번: 대표 메뉴의 수동 원가와 화면·엑셀·인쇄 값을 기준값으로 남긴다.
const ingredients = [
  { productCode: 'CHEESE', ingredientName: '치즈', baseQuantity: 1000, priceOverride: 9999 },
  { ingredientName: '수동 소스', baseQuantity: 300, priceOverride: 1000 },
  { productCode: 'SET', ingredientName: '합성', baseQuantity: 10, compositeOf: ['A', 'B'] },
];
const latest = new Map([
  ['CHEESE', 12345],
  ['A', 100],
  ['B', 200],
]);

describe('수동 원가', () => {
  test('최신 단가 우선, 없으면 수동 단가, 합성은 구성품 합', () => {
    expect(packPriceOf(ingredients[0], latest)).toBe(12345);
    expect(packPriceOf(ingredients[0], new Map())).toBe(9999);
    expect(packPriceOf(ingredients[2], latest)).toBe(300);
  });

  test('반올림 전 값과 0.1원 단위 단가 값을 따로 낸다', () => {
    const result = manualMenuCost(
      [
        { productCode: 'CHEESE', quantity: 100 },
        { ingredientName: '수동소스', quantity: 30 },
      ],
      ingredients,
      latest
    );
    // 12345/1000 = 12.345 → 12.3, 1000/300 = 3.333… → 3.3
    expect(result.exact).toBe(Math.round(100 * 12.345 + 30 * (1000 / 300)));
    expect(result.rounded).toBe(Math.round(100 * 12.3 + 30 * 3.3));
    expect(result.unresolved).toBe(0);
  });

  test('수량이나 단가를 모르는 줄은 계산 불가로 센다', () => {
    const result = manualMenuCost(
      [
        { productCode: 'NONE', quantity: 1 },
        { productCode: 'CHEESE', quantity: '' },
        { ingredientName: '저장 단가', quantity: 2, storedUnitPrice: 5 },
      ],
      ingredients,
      latest
    );
    expect(result.unresolved).toBe(2);
    expect(result.rounded).toBe(10);
  });
});

describe('비교', () => {
  const menu = values => ({ code: 'P', manual: { rounded: 100 }, values });

  test('화면 값이 수동 계산과 2원 넘게 다르면 알린다', () => {
    expect(checkMenuValues(menu({ master: 101, report: 100, excel: 99 }))).toEqual([]);
    expect(checkMenuValues(menu({ master: 110, report: 100 }))).toEqual(['master 110 ≠ 수동 100']);
    expect(checkMenuValues(menu({ master: 100 }))).toEqual(['비교할 화면 값이 부족합니다']);
  });

  test('분류·규격마다 하나씩, 모자라면 채워 5개 이상 고른다', () => {
    const menus = ['a', 'b', 'c', 'd', 'e', 'f'].map(code => ({
      code,
      category: '피자',
      size: 'L',
      eligible: code !== 'a',
    }));
    expect(pickRepresentatives(menus, 5)).toEqual(['b', 'c', 'd', 'e', 'f']);
  });

  test('기준값과 달라진 메뉴 원가와 대표 값만 보고한다', () => {
    const saved = { allMenus: { P: 100, Q: 5 }, menus: [{ code: 'P', values: { excel: 100 } }] };
    expect(diffBaseline(saved, saved)).toEqual([]);
    expect(
      diffBaseline(saved, {
        allMenus: { P: 120, Q: 5 },
        menus: [{ code: 'P', values: { excel: 120 } }],
      })
    ).toEqual([
      { code: 'P', what: '메뉴 원가', before: 100, after: 120 },
      { code: 'P', what: 'excel', before: 100, after: 120 },
    ]);
  });
});
