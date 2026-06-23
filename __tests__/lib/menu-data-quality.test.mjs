import { describe, expect, test } from '@jest/globals';
import { buildMenuDataQualityReport, QUALITY_KINDS } from '../../lib/menu-master/data-quality.js';

function readiness(dims = {}) {
  return {
    dims: {
      price: { status: 'ok' },
      recipe: { status: 'ok' },
      nutrition: { status: 'ok' },
      origin: { status: 'ok' },
      allergen: { status: 'ok' },
      ...dims,
    },
  };
}

describe('menu data quality report', () => {
  test('detects duplicate menu codes and missing selling price', () => {
    const menus = [
      { menuCode: 'P-001-L', menuName: '중복 피자 L', category: '피자', price: 19000 },
      { menuCode: 'P-001-L', menuName: '중복 피자 R', category: '피자', price: 0 },
    ];
    const report = buildMenuDataQualityReport(menus, new Map(), new Map());

    expect(report.categories.find(c => c.kind === QUALITY_KINDS.DUPLICATE_CODE).count).toBe(2);
    expect(report.categories.find(c => c.kind === QUALITY_KINDS.MISSING_SELLING_PRICE).count).toBe(
      1
    );
  });

  test('uses recipe summaries for recipe and unit-price diagnostics', () => {
    const menus = [{ menuCode: 'S-001', menuName: '사이드', category: '사이드', price: 7000 }];
    const recipeSummaryMap = new Map([
      [
        'S-001',
        {
          status: 'needs-price',
          hasRecipe: true,
          missingPriceCount: 2,
          missingQuantityCount: 0,
        },
      ],
    ]);

    const report = buildMenuDataQualityReport(menus, recipeSummaryMap, new Map());

    expect(report.categories.find(c => c.kind === QUALITY_KINDS.MISSING_UNIT_PRICE).count).toBe(1);
    expect(report.categories.find(c => c.kind === QUALITY_KINDS.MISSING_RECIPE).count).toBe(0);
  });

  test('uses readiness output coverage for nutrition, origin, and allergen diagnostics', () => {
    const menus = [{ menuCode: 'P-002-L', menuName: '출시 피자', category: '피자', price: 21000 }];
    const readinessMap = new Map([
      [
        'P-002-L',
        readiness({
          nutrition: { status: 'missing', detail: '영양성분 값이 없습니다' },
          origin: { status: 'missing', detail: '원산지 데이터 없음' },
          allergen: { status: 'missing', detail: '알레르기 데이터 없음' },
        }),
      ],
    ]);

    const report = buildMenuDataQualityReport(menus, new Map(), readinessMap);

    expect(report.categories.find(c => c.kind === QUALITY_KINDS.MISSING_NUTRITION).count).toBe(1);
    expect(report.categories.find(c => c.kind === QUALITY_KINDS.MISSING_ORIGIN).count).toBe(1);
    expect(report.categories.find(c => c.kind === QUALITY_KINDS.MISSING_ALLERGEN).count).toBe(1);
  });
});
