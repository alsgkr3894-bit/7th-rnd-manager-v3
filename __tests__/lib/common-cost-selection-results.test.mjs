import { describe, expect, test } from '@jest/globals';
import { buildDetailRows } from '../../lib/cost/margin/build-rows.js';
import { buildRows } from '../../lib/cost/shared/buildSummaryRows.js';
import { buildCostReportData, buildRecipePrintRows } from '../../lib/report/build-cost-report.js';

const PRICE_ROW = {
  menuCode: 'P-001-L',
  menuName: '테스트 피자',
  category: '피자',
  size: 'L',
  price: 10000,
};

const RECIPE = {
  menuCode: 'P-001-L',
  menuName: '테스트 피자',
  category: '피자',
  size: 'L',
  components: [],
  selectedRecipeGroupIds: ['10'],
};

const RECIPE_MAPS = {
  pizza: new Map([['P-001-L', RECIPE]]),
  personal: new Map(),
  side: new Map(),
  set: new Map(),
};

const UNIT_PRICE_MAP = new Map([['SAUCE', { unitPrice: 10, baseUnitType: 'g' }]]);

const RECIPE_GROUPS = [
  {
    id: 10,
    name: '피자 공통',
    sizes: ['L'],
    defaultCategories: ['피자'],
    ingredients: [
      {
        productCode: 'SAUCE',
        ingredientName: '공통소스',
        quantities: { L: 30 },
        unitType: 'g',
      },
    ],
  },
];

describe('common cost selection results', () => {
  test('원가마진표 행은 체크한 공통원가를 합산한다', () => {
    const rows = buildDetailRows(
      [PRICE_ROW],
      {
        pizzaMap: RECIPE_MAPS.pizza,
        personalMap: RECIPE_MAPS.personal,
        sideMap: RECIPE_MAPS.side,
        setMap: RECIPE_MAPS.set,
      },
      UNIT_PRICE_MAP,
      RECIPE_GROUPS
    );

    expect(rows[0].costMap.L).toBe(300);
  });

  test('전체요약 행은 체크한 공통원가를 합산한다', () => {
    const rows = buildRows([PRICE_ROW], RECIPE_MAPS, UNIT_PRICE_MAP, RECIPE_GROUPS);

    expect(rows[0]).toMatchObject({
      cost: 300,
      hasCost: true,
    });
  });

  test('원가보고서와 레시피 출력도 체크한 공통원가를 포함한다', () => {
    const report = buildCostReportData(
      [PRICE_ROW],
      {
        detailMaps: RECIPE_MAPS,
        edges: [],
        includeEdge: false,
        recipeGroups: RECIPE_GROUPS,
        upm: UNIT_PRICE_MAP,
      },
      ['피자'],
      { 피자: { id: 'pizza', label: '피자', color: '#3182F6' } }
    );
    const recipeRows = buildRecipePrintRows({
      detailMaps: RECIPE_MAPS,
      recipeGroups: RECIPE_GROUPS,
      unitPriceMap: UNIT_PRICE_MAP,
    });

    expect(report.pizza.menus[0].cost).toBe(300);
    expect(recipeRows[0]).toMatchObject({
      componentCount: 1,
      totalCost: 300,
      components: [expect.objectContaining({ productCode: 'SAUCE', subtotal: 300 })],
    });
  });
});
