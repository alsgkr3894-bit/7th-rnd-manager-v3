import { describe, expect, test } from '@jest/globals';
import { buildSalesStats } from '../../lib/report/build-sales-report.js';
import { buildDiscontinuedMenuNameSet } from '../../lib/menu-master/discontinued-lookup.js';

function row({ year, month, category = '피자', groupName = 'A', quantity, revenue = 0 }) {
  return {
    status: 'classified',
    year,
    month,
    category,
    groupName,
    mappedMenuName: groupName,
    quantity,
    revenue,
  };
}

describe('buildSalesStats', () => {
  test('입력이 비어있으면 빈 결과를 반환한다', () => {
    expect(buildSalesStats([], { year: 2026, month: 5, scope: 'all' })).toEqual({
      catShares: [],
      groupRanking: [],
      kpi: null,
    });
  });

  test('periodMode 생략 시(하위 호환) 단일 월 기준으로 전월과 비교한다', () => {
    const rows = [
      row({ year: 2026, month: 5, quantity: 10 }),
      row({ year: 2026, month: 4, quantity: 4 }),
      row({ year: 2026, month: 3, quantity: 99 }), // 범위 밖 — 무시돼야 함
    ];
    const { kpi, groupRanking } = buildSalesStats(rows, { year: 2026, month: 5, scope: 'all' });

    expect(kpi.current).toBe(10);
    expect(kpi.previous).toBe(4);
    expect(groupRanking[0]).toMatchObject({ name: 'A', quantity: 10, prevQty: 4 });
  });

  test('discontinuedNameSet이 없으면 discontinued가 전부 false다(하위 호환)', () => {
    const rows = [row({ year: 2026, month: 5, groupName: 'A', quantity: 10 })];
    const { groupRanking } = buildSalesStats(rows, { year: 2026, month: 5, scope: 'all' });
    expect(groupRanking[0].discontinued).toBe(false);
  });

  test('discontinuedNameSet에 있는 메뉴명은 discontinued:true로 표시된다', () => {
    const rows = [
      row({ year: 2026, month: 5, groupName: 'A', quantity: 10 }),
      row({ year: 2026, month: 5, groupName: 'B', quantity: 5 }),
    ];
    const discontinuedNameSet = buildDiscontinuedMenuNameSet([
      { menuName: 'A', status: 'discontinued' },
      { menuName: 'B', status: 'active' },
    ]);
    const { groupRanking } = buildSalesStats(rows, {
      year: 2026,
      month: 5,
      scope: 'all',
      discontinuedNameSet,
    });

    const byName = Object.fromEntries(groupRanking.map(r => [r.name, r.discontinued]));
    expect(byName.A).toBe(true);
    expect(byName.B).toBe(false);
  });

  test('periodMode=quarter는 분기 3개월을 통합 집계하고 전분기와 비교한다', () => {
    const rows = [
      // 2026 2분기(4~6월)
      row({ year: 2026, month: 4, quantity: 10 }),
      row({ year: 2026, month: 5, quantity: 5 }),
      row({ year: 2026, month: 6, quantity: 3 }),
      // 2026 1분기(1~3월) — 전분기
      row({ year: 2026, month: 1, quantity: 2 }),
      row({ year: 2026, month: 2, quantity: 2 }),
      row({ year: 2026, month: 3, quantity: 2 }),
      // 범위 밖(3분기) — 무시돼야 함
      row({ year: 2026, month: 7, quantity: 999 }),
    ];
    const { kpi, groupRanking } = buildSalesStats(rows, {
      year: 2026,
      month: 2, // 2분기를 가리킴 (quarterOfMonth(2)=1이 아니라, 여기선 monthOrQuarter로 취급)
      periodMode: 'quarter',
      scope: 'all',
    });

    // month 파라미터는 quarter 모드에서 "분기 번호"로 해석된다 (2 = 2분기)
    expect(kpi.current).toBe(18);
    expect(kpi.previous).toBe(6);
    expect(groupRanking[0]).toMatchObject({ name: 'A', quantity: 18, prevQty: 6 });
  });

  test('periodMode=quarter, 1분기면 작년 4분기와 비교한다', () => {
    const rows = [
      row({ year: 2026, month: 1, quantity: 5 }),
      row({ year: 2026, month: 2, quantity: 5 }),
      row({ year: 2026, month: 3, quantity: 5 }),
      row({ year: 2025, month: 10, quantity: 1 }),
      row({ year: 2025, month: 11, quantity: 1 }),
      row({ year: 2025, month: 12, quantity: 1 }),
    ];
    const { kpi } = buildSalesStats(rows, {
      year: 2026,
      month: 1,
      periodMode: 'quarter',
      scope: 'all',
    });

    expect(kpi.current).toBe(15);
    expect(kpi.previous).toBe(3);
  });

  test('periodMode=year는 연도 12개월을 통합 집계하고 작년 전체와 비교한다', () => {
    const rows = [
      ...Array.from({ length: 12 }, (_, i) => row({ year: 2026, month: i + 1, quantity: 1 })),
      ...Array.from({ length: 12 }, (_, i) => row({ year: 2025, month: i + 1, quantity: 2 })),
    ];
    const { kpi } = buildSalesStats(rows, {
      year: 2026,
      month: 1,
      periodMode: 'year',
      scope: 'all',
    });

    expect(kpi.current).toBe(12);
    expect(kpi.previous).toBe(24);
    expect(kpi.deltaPct).toBeCloseTo(-50, 5);
  });

  test('scope 필터는 분기·연 단위 집계에도 동일하게 적용된다', () => {
    const rows = [
      row({ year: 2026, month: 4, category: '피자', quantity: 10 }),
      row({ year: 2026, month: 4, category: '사이드', quantity: 7 }),
    ];
    const { kpi } = buildSalesStats(rows, {
      year: 2026,
      month: 2,
      periodMode: 'quarter',
      scope: '사이드',
    });
    expect(kpi.current).toBe(7);
  });
});
