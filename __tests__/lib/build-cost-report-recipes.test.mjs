import { describe, expect, test } from '@jest/globals';
import {
  buildCostReportData,
  buildRecipePrintMenus,
  buildRecipePrintRows,
} from '@/lib/report/build-cost-report';

describe('buildRecipePrintRows', () => {
  test('상세 레시피를 레시피 출력 행으로 변환한다', () => {
    const rows = buildRecipePrintRows({
      detailMaps: {
        pizza: new Map([
          [
            'P-001-L',
            {
              menuCode: 'P-001-L',
              menuName: '테스트 피자',
              size: 'L',
              components: [
                {
                  productCode: 'CHZ',
                  ingredientName: '치즈',
                  quantity: 20,
                  unit: 'g',
                  unitPrice: 15,
                },
              ],
            },
          ],
        ]),
      },
    });

    expect(rows).toEqual([
      expect.objectContaining({
        categoryLabel: '피자',
        menuCode: 'P-001-L',
        menuName: '테스트 피자',
        size: 'L',
        componentCount: 1,
        totalCost: 300,
        components: [
          expect.objectContaining({
            productCode: 'CHZ',
            ingredientName: '치즈',
            subtotal: 300,
          }),
        ],
      }),
    ]);
  });

  test('빈 canonical 레시피는 구형 레시피 폴백 없이 미작성 행으로 남긴다', () => {
    const rows = buildRecipePrintRows({
      detailMaps: {
        pizza: new Map([
          ['P-001-L', { menuCode: 'P-001-L', menuName: '중복 피자', components: [] }],
        ]),
      },
    });

    expect(rows).toEqual([
      expect.objectContaining({
        source: 'detail',
        categoryLabel: '피자',
        menuCode: 'P-001-L',
        componentCount: 0,
        totalCost: 0,
        components: [],
      }),
    ]);
  });

  test('레시피 출력 행은 최신 단가 맵을 우선한다', () => {
    const rows = buildRecipePrintRows({
      detailMaps: {
        side: new Map([
          [
            'S-001',
            {
              menuCode: 'S-001',
              menuName: '감자튀김',
              components: [{ productCode: 'POT', ingredientName: '감자', quantity: 25, unitPrice: 1 }],
            },
          ],
        ]),
      },
      unitPriceMap: new Map([['POT', { unitPrice: 8 }]]),
    });

    expect(rows[0]).toMatchObject({
      source: 'detail',
      categoryLabel: '사이드',
      componentCount: 1,
      totalCost: 200,
    });
  });

  test('작성된 canonical 레시피만 출력한다', () => {
    const rows = buildRecipePrintRows({
      detailMaps: {
        pizza: new Map([
          [
            'P-001-L',
            {
              menuCode: 'P-001-L',
              menuName: '중복 피자',
              size: 'L',
              components: [
                {
                  productCode: 'NEW',
                  ingredientName: '신규치즈',
                  quantity: 10,
                  unit: 'g',
                  unitPrice: 5,
                },
              ],
            },
          ],
        ]),
      },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      source: 'detail',
      menuCode: 'P-001-L',
      componentCount: 1,
      components: [expect.objectContaining({ productCode: 'NEW' })],
    });
  });

  test('PDF 출력용 레시피를 메뉴 단위로 묶고 사이즈별 사용량을 채운다', () => {
    const menus = buildRecipePrintMenus([
      {
        id: 'detail-pizza-P-OR-001-L',
        categoryLabel: '피자',
        menuCode: 'P-OR-001-L',
        menuName: '테스트 피자',
        size: 'L',
        components: [
          {
            productCode: 'ONION',
            ingredientName: '양파',
            quantity: 10,
            unit: 'g',
            subtotal: 100,
          },
        ],
        componentCount: 1,
        totalCost: 100,
      },
      {
        id: 'detail-pizza-P-OR-001-R',
        categoryLabel: '피자',
        menuCode: 'P-OR-001-R',
        menuName: '테스트 피자',
        size: 'R',
        components: [
          {
            productCode: 'MUSH',
            ingredientName: '버섯',
            quantity: 5,
            unit: 'g',
            subtotal: 80,
          },
        ],
        componentCount: 1,
        totalCost: 80,
      },
    ]);

    expect(menus).toHaveLength(1);
    expect(menus[0]).toMatchObject({
      categoryLabel: '피자',
      menuCode: 'P-OR-001',
      menuName: '테스트 피자',
      sizes: ['L', 'R'],
      componentCount: 2,
      totalCost: 180,
    });
    expect(menus[0].components.map(component => component.ingredientName)).toEqual([
      '양파',
      '버섯',
    ]);
    expect(menus[0].components[0].sizeQuantities).toEqual({
      L: { quantity: 10, unit: 'g' },
      R: { quantity: 0, unit: 'g' },
    });
    expect(menus[0].components[1].sizeQuantities).toEqual({
      L: { quantity: 0, unit: 'g' },
      R: { quantity: 5, unit: 'g' },
    });
  });
});

describe('buildCostReportData recipe precedence', () => {
  const catKeys = ['피자'];
  const catMeta = { 피자: { id: 'pizza', label: '피자', color: '#3182F6' } };
  const price = {
    menuCode: 'P-001-L',
    menuName: '중복 피자',
    category: '피자',
    size: 'L',
    price: 10000,
  };
  const baseCtx = {
    edges: [],
    upm: new Map([['OLD', { unitPrice: 100 }]]),
  };

  test('작성된 canonical 레시피는 원가가 0이어도 구형 원가레시피로 대체하지 않는다', () => {
    const report = buildCostReportData(
      [price],
      {
        ...baseCtx,
        includeEdge: false,
        detailMaps: {
          pizza: new Map([
            [
              'P-001-L',
              {
                menuCode: 'P-001-L',
                menuName: '중복 피자',
                components: [{ productCode: 'NEW', ingredientName: '신규재료', quantity: 10 }],
              },
            ],
          ]),
        },
      },
      catKeys,
      catMeta
    );

    expect(report.pizza.menus[0].cost).toBe(0);
  });

  test('빈 canonical 레시피는 구형 원가레시피 원가를 폴백으로 사용하지 않는다', () => {
    const report = buildCostReportData(
      [price],
      {
        ...baseCtx,
        includeEdge: false,
        detailMaps: {
          pizza: new Map([
            ['P-001-L', { menuCode: 'P-001-L', menuName: '중복 피자', components: [] }],
          ]),
        },
      },
      catKeys,
      catMeta
    );

    expect(report.pizza.menus[0].cost).toBe(0);
  });
});
