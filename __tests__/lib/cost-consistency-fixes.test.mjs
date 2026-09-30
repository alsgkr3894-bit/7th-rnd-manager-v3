import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { isCostRateOverThreshold } from '../../lib/cost/risk-threshold.js';
import { findEdgeForMenu } from '../../lib/cost/edge-dough/lookup.js';
import {
  applyEdgeMenuCosts,
  buildDerivedRows,
  buildDetailRows,
} from '../../lib/cost/margin/build-rows.js';
import { buildRecipePrintRows } from '../../lib/report/recipe-print-rows.js';
import { groupCostMenusBySize } from '../../lib/report/cost-menu-display.js';

// 2026-09-30 전체 점검(병렬 버그 헌트)에서 나온 원가·보고서 불일치 모음.
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('원가율 위험 판정 — 모든 화면이 "N% 초과"(>)로 같다', () => {
  test('정확히 기준값이면 위험이 아니다(전엔 마진표·보고서만 >=로 세었다)', () => {
    expect(isCostRateOverThreshold(40, 40)).toBe(false);
    expect(isCostRateOverThreshold(40.01, 40)).toBe(true);
    expect(isCostRateOverThreshold(39.9, 40)).toBe(false);
    expect(isCostRateOverThreshold(NaN, 40)).toBe(false);
    expect(isCostRateOverThreshold(null, 40)).toBe(false);
  });

  test('마진표·원가 보고서·엑셀·메뉴마스터 헤더가 같은 판정 함수를 쓴다', () => {
    for (const file of [
      'app/cost/margin/useMarginFilters.js',
      'app/report/cost/page.jsx',
      'lib/report/export-cost-xlsx.js',
      'components/report/cost/CostTableView.jsx',
      'components/report/cost/report-view/CostReportCategorySections.jsx',
      'components/menu-master/MenuRecipeSectionHeader.jsx',
    ]) {
      const src = read(file);
      expect(src).toContain('isCostRateOverThreshold(');
      expect(src).not.toMatch(/rate >= (riskThreshold|critPct)/);
    }
  });
});

describe('원가마진표 — 엣지 파생 행은 반쪽 원가를 만들지 않는다', () => {
  const edgeMeta = {
    EXPAND_EDGES: ['치즈크러스트', '씬도우'],
    edgeSuffixByType: { 치즈크러스트: 'C', 씬도우: 'T' },
    edgeCostByType: { 치즈크러스트: { L: 1500, R: 1200 }, 씬도우: { L: 500 } },
    edgePriceByType: { 치즈크러스트: { L: 5000, R: 4000 }, 씬도우: {} },
  };
  const base = {
    id: 'detail||x',
    menuCode: 'P-001-L',
    menuCodes: ['P-001-L', 'P-001-R'],
    menuName: '테스트 피자',
    menuCategory: '피자/오리지널',
    sizes: [
      { label: 'L', sellingPrice: 27900 },
      { label: 'R', sellingPrice: 21400 },
    ],
    costMap: { L: 7000 }, // R 레시피 없음
  };

  test('베이스 피자에 없는 사이즈(R)는 엣지 원가만으로 원가를 만들지 않는다', () => {
    const rows = buildDerivedRows([base], edgeMeta, new Set());
    const cheese = rows.find(r => r.edgeType === '치즈크러스트');
    expect(cheese.costMap).toEqual({ L: 8500 });
    expect(Object.prototype.hasOwnProperty.call(cheese.costMap, 'R')).toBe(false);
  });

  test('엣지에 없는 사이즈(씬도우 R)는 피자 원가만으로 원가를 만들지 않는다', () => {
    const both = { ...base, costMap: { L: 6500, R: 4500 } };
    const rows = buildDerivedRows([both], edgeMeta, new Set());
    const thin = rows.find(r => r.edgeType === '씬도우');
    expect(thin.costMap).toEqual({ L: 7000 });
  });
});

describe('원가마진표 — 엣지 메뉴 행은 cost_edge_dough 원가를 쓴다', () => {
  const edges = [
    { edgeType: '치즈크러스트', size: 'L', components: [{ productCode: 'CHZ', quantity: 100 }] },
    { edgeType: '치즈크러스트', size: 'R', components: [{ productCode: 'CHZ', quantity: 80 }] },
    { edgeType: '씬도우', size: 'L', components: [{ productCode: 'DOU', quantity: 50 }] },
  ];
  const upm = new Map([
    ['CHZ', { unitPrice: 10 }],
    ['DOU', { unitPrice: 4 }],
  ]);
  const prices = [
    {
      menuCode: 'OPT-EDGE-002-L',
      menuName: '치즈크러스트 L',
      category: '엣지',
      size: 'L',
      price: 5000,
    },
    {
      menuCode: 'OPT-EDGE-002-R',
      menuName: '치즈크러스트 R',
      category: '엣지',
      size: 'R',
      price: 4000,
    },
    { menuCode: 'OPT-EDGE-004', menuName: '씬바사삭', category: '엣지', size: '단일', price: 0 },
    { menuCode: 'OPT-EDGE-001', menuName: '석쇠', category: '엣지', size: '단일', price: 0 },
  ];

  test('수정 전: 엣지 행은 레시피가 없어 원가가 비어 있었다', () => {
    const rows = buildDetailRows(prices, { pizzaMap: new Map(), sideMap: new Map() }, upm);
    expect(rows.every(r => Object.keys(r.costMap).length === 0)).toBe(true);
  });

  test('치즈크러스트 L/R·씬바사삭 원가가 채워지고(원가 보고서와 같은 규칙), 석쇠는 그대로 비어 있다', () => {
    const rows = buildDetailRows(prices, { pizzaMap: new Map(), sideMap: new Map() }, upm);
    applyEdgeMenuCosts(rows, edges, upm);
    const cheese = rows.find(r => r.menuName === '치즈크러스트');
    expect(cheese.costMap).toEqual({ L: 1000, R: 800 });
    const thin = rows.find(r => r.menuName === '씬바사삭');
    expect(thin.costMap).toEqual({ 단일: 200 });
    const grill = rows.find(r => r.menuName === '석쇠');
    expect(grill.costMap).toEqual({});
  });

  test('findEdgeForMenu — 패밀리로 찾고, 사이즈 단일은 어느 사이즈든 첫 항목', () => {
    expect(findEdgeForMenu({ menuName: '골드스윗 L', category: '엣지', size: 'L' }, edges)).toBe(
      null
    );
    expect(findEdgeForMenu({ menuName: '씬바사삭', category: '엣지', size: '단일' }, edges)).toBe(
      edges[2]
    );
    expect(findEdgeForMenu({ menuName: '치즈크러스트', category: '엣지', size: 'R' }, edges)).toBe(
      edges[1]
    );
  });
});

describe('레시피 출력 합계 = 원가 보고서 원가 (한 번만 반올림)', () => {
  test('줄마다 반올림한 합(422)이 아니라 원값 합의 반올림(420)', () => {
    const rows = buildRecipePrintRows({
      detailMaps: {
        pizza: new Map([
          [
            'P-001-L',
            {
              menuCode: 'P-001-L',
              menuName: '반올림 피자',
              size: 'L',
              components: [
                { productCode: 'A', ingredientName: 'a', quantity: 1, unit: 'g', unitPrice: 184.5 },
                { productCode: 'B', ingredientName: 'b', quantity: 1, unit: 'g', unitPrice: 110.5 },
                { productCode: 'C', ingredientName: 'c', quantity: 1, unit: 'g', unitPrice: 49.5 },
                { productCode: 'D', ingredientName: 'd', quantity: 1, unit: 'g', unitPrice: 61.5 },
                { productCode: 'E', ingredientName: 'e', quantity: 1, unit: 'g', unitPrice: 13.5 },
              ],
            },
          ],
        ]),
      },
    });
    expect(rows[0].totalCost).toBe(420);
    // 줄 소계는 그대로 반올림해 보여 준다
    expect(rows[0].components.map(c => c.subtotal)).toEqual([185, 111, 50, 62, 14]);
  });
});

describe('원가 보고서 메뉴 묶기 — 같은 이름·다른 코드의 단일 메뉴는 합치지 않는다', () => {
  test('사이드 치즈볼 S-001·S-002가 각각 남는다(전엔 하나로 합쳐져 엑셀에서 사라졌다)', () => {
    const groups = groupCostMenusBySize([
      { code: 'S-001', name: '치즈볼', size: '단일', category: '사이드', cost: 100, sale: 1000 },
      { code: 'S-002', name: '치즈볼', size: '단일', category: '사이드', cost: 200, sale: 2000 },
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.map(g => g.single.code).sort()).toEqual(['S-001', 'S-002']);
  });

  test('L/R 쌍은 여전히 한 그룹이다', () => {
    const groups = groupCostMenusBySize([
      { code: 'P-001-L', name: '피자 L', size: 'L', category: '피자', cost: 1, sale: 2 },
      { code: 'P-001-R', name: '피자 R', size: 'R', category: '피자', cost: 1, sale: 2 },
    ]);
    expect(groups).toHaveLength(1);
    expect(Object.keys(groups[0].sizes).sort()).toEqual(['L', 'R']);
  });
});

describe('배선', () => {
  test('원가 보고서 전체 평균은 rate 0(원가·판매가 없음)을 분모에서 뺀다', () => {
    const src = read('app/report/cost/page.jsx');
    expect(src).toContain('const ratedMenus = allMenus.filter(m => m.rate > 0)');
    expect(src).not.toContain('allMenus.reduce((s, m) => s + m.rate, 0) / totalCount');
  });

  test('마진표 데이터 훅은 엣지 원가를 채운 뒤 하프앤하프를 계산한다', () => {
    const src = read('app/cost/margin/useMarginData.js');
    const edgeAt = src.indexOf('applyEdgeMenuCosts(detailRows, edges, upm)');
    expect(edgeAt).toBeGreaterThan(-1);
    expect(edgeAt).toBeLessThan(src.indexOf('applyHalfHalfCosts(detailRows'));
  });

  test('추이 스냅샷은 수수료·할인·검색을 적용하지 않은 정가 기준 평균을 저장한다', () => {
    expect(read('app/cost/margin/useMarginFilters.js')).toContain('const snapshotStats = useMemo(');
    const actions = read('app/cost/margin/useMarginActions.js');
    expect(actions).toContain('const source = snapshotStats || stats;');
    expect(actions).toContain(
      'const menuCount = snapshotStats ? snapshotStats.menuCount : edgeFiltered.length;'
    );
    expect(read('app/cost/margin/page.jsx')).toContain('snapshotStats,');
  });

  test('원가 보고서 피자 표는 L/R이 아닌 단일 메뉴도 보여 준다', () => {
    for (const file of [
      'components/report/cost/CostTableView.jsx',
      'components/report/cost/report-view/CostReportCategorySections.jsx',
    ]) {
      expect(read(file)).toContain("? ' (단일)' : ''");
    }
  });
});
