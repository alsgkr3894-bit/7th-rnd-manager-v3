import { describe, expect, test } from '@jest/globals';
import { buildDerivedRows, buildDetailRows } from '../../lib/cost/margin/build-rows.js';
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

  test('원가마진표 행은 음수 공통원가를 차감값으로 보존한다', () => {
    const rows = buildDetailRows(
      [PRICE_ROW],
      {
        pizzaMap: RECIPE_MAPS.pizza,
        personalMap: RECIPE_MAPS.personal,
        sideMap: RECIPE_MAPS.side,
        setMap: RECIPE_MAPS.set,
      },
      UNIT_PRICE_MAP,
      [
        {
          ...RECIPE_GROUPS[0],
          ingredients: [
            {
              productCode: 'SAUCE',
              ingredientName: '차감소스',
              quantities: { L: -30 },
              unitType: 'g',
            },
          ],
        },
      ]
    );

    expect(rows[0].costMap.L).toBe(-300);
  });

  test('원가마진표 파생 엣지 행은 음수 엣지 원가를 기존 원가에서 차감한다', () => {
    const rows = buildDerivedRows(
      [
        {
          id: 'detail||base',
          menuCode: 'P-001-L',
          menuName: '테스트 피자',
          menuCategory: '피자',
          sizes: [{ label: 'L', sellingPrice: 10000 }],
          costMap: { L: 500 },
        },
      ],
      {
        EXPAND_EDGES: ['엣지'],
        edgeSuffixByType: { 엣지: 'ED' },
        edgeCostByType: { 엣지: { L: -200 } },
        edgePriceByType: { 엣지: 1000 },
      },
      new Set()
    );

    expect(rows[0]).toMatchObject({
      menuName: '테스트 피자 엣지',
      costMap: { L: 300 },
      sizes: [{ label: 'L', sellingPrice: 11000 }],
    });
  });

  test('원가마진표 행은 L/R 사이즈 코드가 달라도 한 메뉴 행으로 합친다', () => {
    const rows = buildDetailRows(
      [
        {
          menuCode: 'P-OR-009-L',
          menuName: '테스트 피자 L',
          category: '피자/오리지널',
          size: 'L',
          price: 20000,
        },
        {
          menuCode: 'P-OR-009-R',
          menuName: '테스트 피자 R',
          category: '피자/오리지널',
          size: 'R',
          price: 17000,
        },
      ],
      {
        pizzaMap: new Map([
          [
            'P-OR-009-L',
            {
              menuCode: 'P-OR-009-L',
              menuName: '테스트 피자 L',
              category: '피자/오리지널',
              size: 'L',
              components: [{ productCode: 'SAUCE', ingredientName: '소스', quantity: 30 }],
            },
          ],
          [
            'P-OR-009-R',
            {
              menuCode: 'P-OR-009-R',
              menuName: '테스트 피자 R',
              category: '피자/오리지널',
              size: 'R',
              components: [{ productCode: 'SAUCE', ingredientName: '소스', quantity: 20 }],
            },
          ],
        ]),
        personalMap: new Map(),
        sideMap: new Map(),
        setMap: new Map(),
      },
      UNIT_PRICE_MAP,
      []
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].menuName).toBe('테스트 피자');
    expect(rows[0].menuCodeBase).toBe('P-OR-009');
    expect(rows[0].menuCodes).toEqual(['P-OR-009-L', 'P-OR-009-R']);
    expect(rows[0].sizes).toEqual([
      { label: 'L', sellingPrice: 20000 },
      { label: 'R', sellingPrice: 17000 },
    ]);
    expect(rows[0].costMap).toEqual({ L: 300, R: 200 });
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
      components: [
        expect.objectContaining({
          sourceType: 'common',
          sourceLabel: '피자 공통',
          productCode: 'SAUCE',
          subtotal: 300,
        }),
      ],
    });
  });

  test('원가보고서 메뉴명은 판매가 이름의 L/R 접미사를 중복 표시하지 않는다', () => {
    const report = buildCostReportData(
      [
        {
          menuCode: 'P-OR-010-L',
          menuName: '샘스테이크 피자 L',
          category: '피자/오리지널',
          size: 'L',
          price: 32500,
        },
        {
          menuCode: 'P-OR-010-R',
          menuName: '샘스테이크 피자 R',
          category: '피자/오리지널',
          size: 'R',
          price: 25900,
        },
      ],
      {
        detailMaps: {
          pizza: new Map([
            [
              'P-OR-010-L',
              {
                menuCode: 'P-OR-010-L',
                menuName: '샘스테이크 피자 L',
                category: '피자/오리지널',
                size: 'L',
                components: [{ productCode: 'SAUCE', ingredientName: '소스', quantity: 30 }],
              },
            ],
            [
              'P-OR-010-R',
              {
                menuCode: 'P-OR-010-R',
                menuName: '샘스테이크 피자 R',
                category: '피자/오리지널',
                size: 'R',
                components: [{ productCode: 'SAUCE', ingredientName: '소스', quantity: 20 }],
              },
            ],
          ]),
          personal: new Map(),
          side: new Map(),
          set: new Map(),
        },
        edges: [],
        includeEdge: false,
        recipeGroups: [],
        upm: UNIT_PRICE_MAP,
      },
      ['피자'],
      { 피자: { id: 'pizza', label: '피자', color: '#3182F6' } }
    );

    expect(report.pizza.menus).toEqual([
      expect.objectContaining({
        code: 'P-OR-010-L',
        codeBase: 'P-OR-010',
        name: '샘스테이크 피자',
        size: 'L',
        sale: 32500,
      }),
      expect.objectContaining({
        code: 'P-OR-010-R',
        codeBase: 'P-OR-010',
        name: '샘스테이크 피자',
        size: 'R',
        sale: 25900,
      }),
    ]);
  });
});
