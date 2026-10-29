import { describe, expect, test } from '@jest/globals';
import { buildDetailRows } from '../../lib/cost/margin/build-rows.js';
import { buildRecipePrintRows } from '../../lib/report/recipe-print-rows.js';
import { effectiveComponentsCost } from '../../lib/cost/shared/effective-cost.js';
import { edgeTotalCost } from '../../lib/cost/edge-dough/calc.js';

// 2026-10-29: 해남고구마무스(제품코드 없는 수동 식자재) 단가를 바꿔도 코드 없이 저장된 레시피 줄이
// 원가마진표·레시피 출력·원가보고서에서만 옛 단가로 남던 문제 — 모든 원가 화면이 같은 값을 내야 한다.
const ingredient = (name, unitPrice, extra = {}) => ({ ingredientName: name, unitPrice, ...extra });

function setup(mousseUnitPrice) {
  const unitPriceMap = new Map([
    ['152', ingredient('해남고구마무스', mousseUnitPrice)],
    ['7001', ingredient('모짜렐라', 5)],
  ]);
  const recipe = {
    menuCode: 'P-PR-004-L',
    menuName: '땅끝달콤고구마',
    category: '피자',
    size: 'L',
    components: [
      // 코드 없이 이름만 저장된 옛 줄 — 저장 당시 단가 8.69
      { ingredientName: '해남고구마무스', quantity: 100, unitPrice: 8.69 },
      { ingredientName: '모짜렐라', productCode: '7001', quantity: 10, unitPrice: 5 },
    ],
  };
  const detailMaps = {
    pizzaMap: new Map([[recipe.menuCode, recipe]]),
    personalMap: new Map(),
    sideMap: new Map(),
    setMap: new Map(),
    toppingMap: new Map(),
  };
  return { unitPriceMap, recipe, detailMaps };
}

function marginCost(detailMaps, unitPriceMap) {
  const rows = buildDetailRows(
    [
      {
        menuCode: 'P-PR-004-L',
        menuName: '땅끝달콤고구마',
        category: '피자',
        size: 'L',
        price: 30000,
      },
    ],
    detailMaps,
    unitPriceMap,
    []
  );
  return rows[0]?.costMap?.L;
}

function printCost(recipe, unitPriceMap) {
  const rows = buildRecipePrintRows({
    detailMaps: { pizza: new Map([[recipe.menuCode, recipe]]) },
    unitPriceMap,
  });
  return rows.find(row => row.menuCode === recipe.menuCode)?.totalCost;
}

describe('수동 식자재 단가 변경이 모든 원가 화면에 같이 반영된다', () => {
  test('단가를 올리면 원가마진표와 레시피 출력이 같은 새 원가를 낸다', () => {
    const before = setup(8.69);
    const after = setup(10);

    expect(marginCost(before.detailMaps, before.unitPriceMap)).toBe(919);
    expect(marginCost(after.detailMaps, after.unitPriceMap)).toBe(1050);
    expect(printCost(after.recipe, after.unitPriceMap)).toBe(1050);
    expect(effectiveComponentsCost(after.recipe.components, after.unitPriceMap)).toBe(1050);
  });

  test('이름이 겹치면 저장 단가를 유지한다(잘못 연결하지 않음)', () => {
    const { unitPriceMap, recipe, detailMaps } = setup(10);
    unitPriceMap.set('153', ingredient('해남고구마무스', 20));
    expect(marginCost(detailMaps, unitPriceMap)).toBe(919);
    expect(printCost(recipe, unitPriceMap)).toBe(919);
  });

  test('엣지 원가도 같은 규칙을 따른다', () => {
    const { unitPriceMap } = setup(10);
    const edge = {
      components: [{ ingredientName: '해남고구마무스', quantity: 50, unitPrice: 8.69 }],
    };
    expect(edgeTotalCost(edge, unitPriceMap)).toBe(500);
  });
});
