import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { buildRecipePrintMenus } from '../../lib/report/recipe-print-rows.js';
import {
  formatSizeMoney,
  sectionSizeCosts,
} from '../../components/report/cost/recipe-print/recipePrintFormat.js';

// 2026-10-30 원가 흐름 점검(원가 출력): 레시피 출력의 소계·메뉴 합계가 L과 R을 더한 값으로 나와
// 어느 규격의 원가도 아닌 숫자가 찍혔다. 규격이 여럿이면 규격별로 보여 준다.
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

const row = (menuCode, size, totalCost, subtotals) => ({
  menuCode,
  menuName: '포테이토 피자',
  categoryLabel: '피자',
  kind: 'pizza',
  size,
  totalCost,
  components: subtotals.map(([name, quantity, subtotal]) => ({
    ingredientName: name,
    productCode: name,
    quantity,
    unit: 'g',
    subtotal,
    sourceType: 'direct',
  })),
});

const rows = [
  row('P-OR-002-L', 'L', 6511, [
    ['치즈', 100, 4000],
    ['감자', 50, 2511],
  ]),
  row('P-OR-002-R', 'R', 4916, [
    ['치즈', 70, 2800],
    ['감자', 40, 2116],
  ]),
];

describe('레시피 출력 규격별 합계', () => {
  const [menu] = buildRecipePrintMenus(rows);

  test('메뉴 묶음이 규격별 합계를 담는다(전체 합과 별개로)', () => {
    expect(menu.sizes).toEqual(['L', 'R']);
    expect(menu.sizeTotals).toEqual({ L: 6511, R: 4916 });
    expect(menu.totalCost).toBe(11427); // 기존 필드는 그대로(다른 곳이 쓴다)
  });

  test('규격이 둘이면 "L 6,511원 / R 4,916원"으로, 하나면 한 금액으로 보여 준다', () => {
    expect(formatSizeMoney(menu.sizeTotals, menu.sizes, menu.totalCost)).toBe(
      'L 6,511원 / R 4,916원'
    );
    expect(formatSizeMoney({ 단일: 2319 }, ['단일'], 2319)).toBe('2,319원');
    expect(formatSizeMoney({}, ['단일'], 0)).toBe('—');
  });

  test('구성품 소계도 규격별로, 구성품 묶음 합도 규격별로 나온다', () => {
    const cheese = menu.components.find(c => c.ingredientName === '치즈');
    expect(formatSizeMoney(cheese.sizeSubtotals, menu.sizes, cheese.totalCost)).toBe(
      'L 4,000원 / R 2,800원'
    );
    expect(sectionSizeCosts(menu.components)).toEqual({ L: 6511, R: 4916 });
  });

  test('메뉴 합계·소계 칸이 규격별 표시를 쓴다', () => {
    expect(read('components/report/cost/recipe-print/RecipeMenuBlock.jsx')).toContain(
      'formatSizeMoney(menu.sizeTotals'
    );
    expect(read('components/report/cost/recipe-print/RecipeComponentTable.jsx')).toContain(
      'formatSizeMoney(component.sizeSubtotals'
    );
  });
});
