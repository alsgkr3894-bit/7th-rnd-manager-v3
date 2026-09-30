import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import {
  HALF_HALF_COST_NOTE,
  buildHalfHalfCostBySize,
  buildHalfHalfNote,
  formatHalfHalfBasis,
} from '../../lib/cost/half-half.js';
import {
  applyHalfHalfCosts,
  buildDerivedRows,
  buildDetailRows,
} from '../../lib/cost/margin/build-rows.js';
import { buildCostReportData } from '../../lib/report/build-cost-report.js';

// 2026-09-30 주임님: 하프앤하프 원가 = 사이즈별 오리지널 피자 중 (최대 원가 + 최소 원가) ÷ 2.
// 하프앤하프 메뉴(P-HH-001-L/R)는 레시피가 비어 있어 원가마진표엔 원가가 비고
// 원가 보고서엔 "원가 미연결"로 잡혔다.

// 원가 = 수량(단가 1원) — 계산을 눈으로 따라가기 쉽게
const upm = new Map([['X', { unitPrice: 1 }]]);
const recipe = (menuCode, quantity) => [
  menuCode,
  { menuCode, components: [{ productCode: 'X', ingredientName: '재료', quantity }] },
];
const pizzaMap = new Map([
  recipe('P-OR-001-L', 3000),
  recipe('P-OR-001-R', 2400),
  recipe('P-OR-002-L', 4000),
  recipe('P-OR-002-R', 2000), // R 최소는 002, L 최소는 001 — 사이즈마다 다른 피자
  recipe('P-OR-003-L', 5000),
  recipe('P-OR-003-R', 3600),
  recipe('P-OR-004-L', 9000), // 단종 — 후보에서 빠져야 한다
  recipe('P-OR-004-R', 9000),
  recipe('P-PS-001-L', 20000), // 프리미엄 — 오리지널이 아니라 후보가 아니다
]);
const price = (menuCode, menuName, category, size, value) => ({
  menuCode,
  menuName,
  category,
  size,
  price: value,
});
const prices = [
  price('P-OR-001-L', '까망베르 피자 L', '피자/오리지널', 'L', 26900),
  price('P-OR-001-R', '까망베르 피자 R', '피자/오리지널', 'R', 20900),
  price('P-OR-002-L', '포테이토 피자 L', '피자/오리지널', 'L', 27900),
  price('P-OR-002-R', '포테이토 피자 R', '피자/오리지널', 'R', 21400),
  price('P-OR-003-L', '불고기 피자 L', '피자/오리지널', 'L', 27900),
  price('P-OR-003-R', '불고기 피자 R', '피자/오리지널', 'R', 21400),
  price('P-OR-004-L', '단종 피자 L', '피자/오리지널', 'L', 27900),
  price('P-OR-004-R', '단종 피자 R', '피자/오리지널', 'R', 21400),
  price('P-PS-001-L', '스페셜 피자 L', '피자/프리미엄 스페셜', 'L', 33900),
  price('P-HH-001-L', '하프앤하프 피자', '피자/하프앤하프', 'L', 28900),
  price('P-HH-001-R', '하프앤하프 피자', '피자/하프앤하프', 'R', 22900),
];
const discontinuedCodes = new Set(['P-OR-004-L', 'P-OR-004-R']);
// L: 최대 5000(불고기) + 최소 3000(까망베르) → 4000 / R: 최대 3600(불고기) + 최소 2000(포테이토) → 2800
const EXPECTED = { L: 4000, R: 2800 };

describe('buildHalfHalfCostBySize', () => {
  test('사이즈별 최대·최소 원가의 평균', () => {
    const result = buildHalfHalfCostBySize([
      { menuName: 'A', size: 'L', cost: 3000 },
      { menuName: 'B', size: 'L', cost: 5000 },
      { menuName: 'C', size: 'L', cost: 4000 },
      { menuName: 'A', size: 'R', cost: 2400 },
      { menuName: 'D', size: 'R', cost: 2000 },
    ]);
    expect(result.L).toMatchObject({ cost: 4000, count: 3 });
    expect(result.L.max.menuName).toBe('B');
    expect(result.L.min.menuName).toBe('A');
    expect(result.R).toMatchObject({ cost: 2200, count: 2 });
    expect(result.R.min.menuName).toBe('D');
  });

  test('원가 0·숫자 아님·사이즈 없음은 후보가 아니다', () => {
    const result = buildHalfHalfCostBySize([
      { size: 'L', cost: 0 },
      { size: 'L', cost: 'abc' },
      { size: '', cost: 3000 },
      { size: 'L', cost: 1500 },
    ]);
    expect(result.L).toMatchObject({ cost: 1500, count: 1 });
    expect(result.L.max).toBe(result.L.min);
  });

  test('후보가 없으면 그 사이즈는 결과에 없다', () => {
    expect(buildHalfHalfCostBySize([])).toEqual({});
    expect(buildHalfHalfCostBySize(null)).toEqual({});
  });

  test('반올림하지 않는다(표시할 때 반올림)', () => {
    expect(
      buildHalfHalfCostBySize([
        { size: 'L', cost: 1000.4 },
        { size: 'L', cost: 1001 },
      ]).L.cost
    ).toBeCloseTo(1000.7);
  });
});

describe('설명 문구', () => {
  const basis = {
    max: { menuName: '컨츄리치킨 피자 L', cost: 7614 },
    min: { menuName: '페페로니 피자', cost: 5976.4 },
    count: 7,
  };

  test('근거는 최대·최소 피자 이름과 원가(원 단위 반올림), 사이즈 접미사는 뺀다', () => {
    expect(formatHalfHalfBasis(basis)).toBe(
      '최대 컨츄리치킨 피자 7,614원 · 최소 페페로니 피자 5,976원'
    );
  });

  test('후보가 하나면 "기준"으로 한 번만 적는다', () => {
    const one = { max: basis.max, min: basis.max, count: 1 };
    expect(formatHalfHalfBasis(one)).toBe('기준 컨츄리치킨 피자 7,614원');
  });

  test('보고서 문구: 오리지널 기준 최대·최소 원가라는 설명 + L/R 근거', () => {
    const note = buildHalfHalfNote({ R: basis, L: basis });
    expect(note.startsWith('※ ' + HALF_HALF_COST_NOTE)).toBe(true);
    expect(HALF_HALF_COST_NOTE).toContain('오리지널 피자 중 최대 원가와 최소 원가');
    // L이 먼저
    expect(note.indexOf('L: 최대')).toBeLessThan(note.indexOf('R: 최대'));
  });

  test('근거가 없으면 문구도 없다', () => {
    expect(buildHalfHalfNote({})).toBe('');
    expect(buildHalfHalfNote(null)).toBe('');
  });
});

describe('원가마진표 — applyHalfHalfCosts', () => {
  const build = () =>
    buildDetailRows(prices, { pizzaMap, personalMap: new Map(), sideMap: new Map() }, upm);
  const halfRow = rows => rows.find(r => r.menuCategory === '피자/하프앤하프');

  test('수정 전: 하프앤하프 행은 원가가 비어 있다', () => {
    expect(halfRow(build()).costMap).toEqual({});
  });

  test('하프앤하프 행에 사이즈별 원가와 근거가 채워진다(단종·프리미엄 제외)', () => {
    const rows = applyHalfHalfCosts(build(), { discontinuedCodes });
    const row = halfRow(rows);
    expect(row.costMap).toEqual(EXPECTED);
    expect(row.halfHalf.L.max).toMatchObject({ menuCode: 'P-OR-003-L', cost: 5000 });
    expect(row.halfHalf.L.min).toMatchObject({ menuCode: 'P-OR-001-L', cost: 3000 });
    expect(row.halfHalf.R.min).toMatchObject({ menuCode: 'P-OR-002-R', cost: 2000 });
    expect(row.halfHalf.L.count).toBe(3);
  });

  test('단종을 빼지 않으면 결과가 달라진다(단종 제외가 실제로 작동하는지 확인)', () => {
    const row = halfRow(applyHalfHalfCosts(build()));
    expect(row.costMap.L).toBe((9000 + 3000) / 2);
  });

  test('하프앤하프에 자체 레시피 원가가 있는 사이즈는 덮어쓰지 않는다', () => {
    const ownMap = new Map([...pizzaMap, recipe('P-HH-001-L', 1234)]);
    const rows = buildDetailRows(prices, { pizzaMap: ownMap }, upm);
    const row = halfRow(applyHalfHalfCosts(rows, { discontinuedCodes }));
    expect(row.costMap).toEqual({ L: 1234, R: EXPECTED.R });
    expect(row.halfHalf.L).toBeUndefined();
  });

  test('하프앤하프는 엣지 파생 행을 만들지 않는다', () => {
    const rows = applyHalfHalfCosts(build(), { discontinuedCodes });
    const edgeMeta = {
      EXPAND_EDGES: ['치즈크러스트'],
      edgeSuffixByType: { 치즈크러스트: 'CC' },
      edgeCostByType: { 치즈크러스트: { L: 500, R: 400 } },
      edgePriceByType: {},
    };
    const derived = buildDerivedRows(rows, edgeMeta, new Set());
    expect(derived.some(r => r.menuCategory === '피자/하프앤하프')).toBe(false);
    expect(derived.some(r => r.menuCategory === '피자/오리지널')).toBe(true);
  });
});

describe('원가 보고서 — buildCostReportData', () => {
  const catKeys = ['피자'];
  const catMeta = { 피자: { id: 'pizza', label: '피자', color: '#3182F6' } };
  const ctx = { edges: [], upm, detailMaps: { pizza: pizzaMap }, recipeGroups: [] };

  test('하프앤하프 L/R 원가·원가율이 채워지고 원가 미연결 목록에서 빠진다', () => {
    const report = buildCostReportData(prices, { ...ctx, discontinuedCodes }, catKeys, catMeta);
    const half = report.pizza.menus.filter(m => m.code.startsWith('P-HH'));
    const bySize = Object.fromEntries(half.map(m => [m.size, m]));
    expect(bySize.L.cost).toBe(EXPECTED.L);
    expect(bySize.R.cost).toBe(EXPECTED.R);
    expect(bySize.L.rate).toBeCloseTo((EXPECTED.L / 28900) * 100);
    // 보고서 문구에 쓸 근거가 메뉴에 붙는다
    expect(bySize.L.halfHalf.max).toMatchObject({ menuCode: 'P-OR-003-L', cost: 5000 });
    expect(bySize.R.halfHalf.min).toMatchObject({ menuCode: 'P-OR-002-R', cost: 2000 });
    // 다른 피자에는 붙지 않는다
    expect(report.pizza.menus.find(m => m.code === 'P-OR-001-L').halfHalf).toBeUndefined();
    const diagCodes = (report._diagnostics || []).map(d => d.code);
    expect(diagCodes.some(code => code.startsWith('P-HH'))).toBe(false);
  });

  test('단종 코드를 넘기지 않으면(수정 전 호출) 단종도 후보가 된다', () => {
    const report = buildCostReportData(prices, ctx, catKeys, catMeta);
    const halfL = report.pizza.menus.find(m => m.code === 'P-HH-001-L');
    expect(halfL.cost).toBe((9000 + 3000) / 2);
  });
});

describe('배선', () => {
  const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
  test('원가마진표는 detailRows 직후 단종 코드를 넘겨 applyHalfHalfCosts를 호출한다', () => {
    const src = read('app/cost/margin/useMarginData.js');
    const applyAt = src.indexOf('applyHalfHalfCosts(detailRows, { discontinuedCodes })');
    expect(applyAt).toBeGreaterThan(-1);
    expect(applyAt).toBeLessThan(src.indexOf('const pizzaSources'));
  });

  test('원가 보고서는 단종 코드를 ctx에 넣는다', () => {
    const src = read('app/report/cost/page.jsx');
    expect(src).toContain('discontinuedCodes,');
    expect(src).toContain('const discontinuedCodes = buildDiscontinuedMenuCodeSet(masters)');
  });

  test('원가 보고서 두 화면(보고서·표)이 하프앤하프 행 아래에 설명 문구를 그린다', () => {
    for (const file of [
      'components/report/cost/report-view/CostReportCategorySections.jsx',
      'components/report/cost/CostTableView.jsx',
    ]) {
      const src = read(file);
      expect(src).toContain('<HalfHalfNote sizes={');
    }
    expect(read('components/report/cost/HalfHalfNote.jsx')).toContain('buildHalfHalfNote(');
  });

  test('PDF 인쇄: 원가 보고서 카테고리 표는 페이지 사이에서 잘리지 않는다', () => {
    const print = read('lib/report/print.js');
    const keep = print.indexOf('.paper-section.print-keep-together {');
    expect(keep).toBeGreaterThan(-1);
    expect(print.slice(keep, keep + 200)).toContain('break-inside: avoid !important');
    // 일반 .paper-section(auto) 규칙보다 뒤에 있어야 덮어쓴다
    expect(keep).toBeGreaterThan(print.indexOf('.paper-section {'));
    expect(print).toContain('.print-keep-together .paper-section-title {');
    for (const file of [
      'components/report/cost/report-view/CostReportCategorySections.jsx',
      'components/report/cost/CostTableView.jsx',
    ]) {
      expect(read(file)).toContain('paper-cat-section print-keep-together');
    }
  });

  test('마진표 행은 하프앤하프 근거(최대·최소)를 원가 칸에 표시한다', () => {
    const src = read('components/cost/margin/MarginRow.jsx');
    expect(src).toContain('formatHalfHalfBasis(r.halfHalf[l])');
  });
});
