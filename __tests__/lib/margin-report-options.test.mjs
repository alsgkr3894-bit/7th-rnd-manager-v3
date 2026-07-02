import {
  BASE_EDGE_KEY,
  buildMarginPizzaCostRateSummary,
  collectMarginReportCategories,
  collectMarginReportEdgeOptions,
  collectMarginReportSizeOptions,
  filterMarginReportRows,
} from '../../lib/cost/margin/report-options.js';

const ROWS = [
  {
    id: 'detail||p-001',
    menuName: '오리지널 피자',
    menuCategory: '피자',
    sizes: [
      { label: 'L', sellingPrice: 20000 },
      { label: 'R', sellingPrice: 17000 },
    ],
    costMap: { L: 7000, R: 5500 },
  },
  {
    id: 'derived||p-001||씬도우',
    isDerivedEdge: true,
    edgeType: '씬도우',
    menuName: '오리지널 피자 씬도우',
    menuCategory: '피자',
    sizes: [{ label: 'L', sellingPrice: 21000 }],
    costMap: { L: 7600 },
  },
  {
    id: 'detail||side-001',
    menuName: '사이드',
    menuCategory: '사이드',
    sizes: [{ label: '단품', sellingPrice: 6000 }],
    costMap: { 단품: 1200 },
  },
];

describe('margin report options helpers', () => {
  test('카테고리, 엣지, 사이즈 옵션을 출력용 값으로 수집한다', () => {
    expect(collectMarginReportCategories(ROWS)).toEqual(['사이드', '피자']);
    expect(collectMarginReportEdgeOptions(ROWS)).toEqual([
      { key: BASE_EDGE_KEY, label: '석쇠기본' },
      { key: '씬도우', label: '씬도우' },
    ]);
    expect(collectMarginReportSizeOptions(ROWS)).toEqual(['L', 'R', '단일']);
  });

  test('선택한 카테고리·엣지·사이즈만 출력 행으로 남긴다', () => {
    const rows = filterMarginReportRows(ROWS, {
      categorySelection: { 피자: true, 사이드: false },
      edgeSelection: { [BASE_EDGE_KEY]: false, 씬도우: true },
      sizeSelection: { L: true, R: false, 단일: false },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      menuName: '오리지널 피자 씬도우',
      sizes: [{ label: 'L', sellingPrice: 21000 }],
      costMap: { L: 7600 },
    });
  });

  test('단품·세트 같은 비 L/R 사이즈는 단일 컬럼으로 정규화한다', () => {
    const rows = filterMarginReportRows(ROWS, {
      categorySelection: { 피자: false, 사이드: true },
      edgeSelection: { [BASE_EDGE_KEY]: true, 씬도우: false },
      sizeSelection: { L: false, R: false, 단일: true },
    });

    expect(rows).toEqual([
      expect.objectContaining({
        menuName: '사이드',
        sizes: [{ label: '단일', sellingPrice: 6000 }],
        costMap: { 단일: 1200 },
      }),
    ]);
  });

  test('피자 전체·카테고리별·L/R 사이즈별 평균 원가율을 계산한다', () => {
    const rows = [
      ...ROWS,
      {
        id: 'detail||premium-001',
        menuName: '프리미엄 피자',
        menuCategory: '피자/프리미엄',
        sizes: [
          { label: 'L', sellingPrice: 24000 },
          { label: 'R', sellingPrice: 20000 },
        ],
        costMap: { L: 9600, R: 7000 },
      },
    ];
    const summary = buildMarginPizzaCostRateSummary(rows, { fees: [] }, null);

    expect(summary.total.count).toBe(5);
    expect(summary.total.avg).toBeCloseTo((35 + 5500 / 170 + 7600 / 210 + 40 + 35) / 5, 4);
    expect(summary.sizes.L.count).toBe(3);
    expect(summary.sizes.L.avg).toBeCloseTo((35 + 7600 / 210 + 40) / 3, 4);
    expect(summary.sizes.R.count).toBe(2);
    expect(summary.sizes.R.avg).toBeCloseTo((5500 / 170 + 35) / 2, 4);
    expect(summary.categories.map(row => row.category)).toEqual(['피자', '피자/프리미엄']);
    expect(summary.categories[0].sizes.L.count).toBe(2);
    expect(summary.categories[1].total.avg).toBeCloseTo(37.5, 4);
  });
});
