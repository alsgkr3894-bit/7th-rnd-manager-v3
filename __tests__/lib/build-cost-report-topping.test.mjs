import { describe, expect, test } from '@jest/globals';
import { buildCostReportData } from '@/lib/report/build-cost-report';

/**
 * 회귀 테스트: 원가보고서(buildCostReportData)의 detailStoreFor가 '추가토핑' 카테고리를
 * 인식하지 못해 원가마진표(c9ee0f93에서 고친 것)와 같은 종류로 전체 누락되던 버그.
 */
const catKeys = ['추가토핑'];
const catMeta = { 추가토핑: { id: 'topping', label: '추가토핑', color: '#14B8A6' } };

describe('buildCostReportData — 추가토핑', () => {
  test('toppingMap의 레시피로 원가·원가율을 계산하고 미매핑으로 빠지지 않는다', () => {
    const price = {
      menuCode: 'T-ETC-001',
      menuName: '치즈 80g',
      category: '추가토핑',
      size: '단일',
      price: 2000,
    };
    const report = buildCostReportData(
      [price],
      {
        detailMaps: {
          pizza: new Map(),
          personal: new Map(),
          side: new Map(),
          set: new Map(),
          topping: new Map([
            [
              'T-ETC-001',
              {
                menuCode: 'T-ETC-001',
                category: '추가토핑',
                components: [{ productCode: 'C1', quantity: 80, unit: 'g' }],
              },
            ],
          ]),
        },
        edges: [],
        recipeGroups: [],
        upm: new Map([['C1', { unitPrice: 5 }]]),
      },
      catKeys,
      catMeta
    );

    expect(report.topping.menus[0].cost).toBe(400); // 80 * 5
    expect(report.topping.menus[0].rate).toBeCloseTo(20); // 400/2000*100
    expect(report._diagnostics).toEqual([]);
  });

  test('레시피가 없으면 "레시피 미등록"으로 진단되고 "분류 미매핑"이 되지 않는다', () => {
    const price = {
      menuCode: 'T-ETC-099',
      menuName: '아직 안 만든 토핑',
      category: '추가토핑',
      size: '단일',
      price: 1000,
    };
    const report = buildCostReportData(
      [price],
      {
        detailMaps: {
          pizza: new Map(),
          personal: new Map(),
          side: new Map(),
          set: new Map(),
          topping: new Map(),
        },
        edges: [],
        recipeGroups: [],
        upm: new Map(),
      },
      catKeys,
      catMeta
    );

    expect(report.topping.menus[0].cost).toBe(0);
    expect(report._diagnostics).toEqual([
      expect.objectContaining({ code: 'T-ETC-099', reason: '레시피 미등록' }),
    ]);
  });
});
