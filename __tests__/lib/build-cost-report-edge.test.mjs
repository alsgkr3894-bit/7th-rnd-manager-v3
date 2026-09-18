import { describe, expect, test } from '@jest/globals';
import { buildCostReportData } from '@/lib/report/build-cost-report';

/**
 * 회귀 테스트: 원가보고서의 엣지 원가 매칭이 cost_selling_prices.menuName과
 * cost_edge_dough.edgeType의 정확 일치에만 의존해, 실데이터 이름('골드스윗'·'씬바사삭')이
 * edgeType('골드스윗크러스트'·'씬도우')과 완전히 같지 않으면 원가 0으로 잘못 나오던 버그.
 */
const catKeys = ['엣지', '피자'];
const catMeta = {
  엣지: { id: 'edge', label: '엣지', color: '#000' },
  피자: { id: 'pizza', label: '피자', color: '#111' },
};

const baseCtx = {
  detailMaps: { pizza: new Map(), personal: new Map(), side: new Map(), set: new Map() },
  recipeGroups: [],
  upm: new Map(),
};

describe('buildCostReportData — 엣지 원가 매칭', () => {
  test('이름이 edgeType과 완전히 같지 않아도 패밀리로 원가를 찾는다', () => {
    const report = buildCostReportData(
      [
        {
          menuCode: 'OPT-EDGE-003',
          menuName: '골드스윗',
          category: '엣지',
          size: '단일',
          price: 4000,
        },
        {
          menuCode: 'OPT-EDGE-004',
          menuName: '씬바사삭',
          category: '엣지',
          size: '단일',
          price: 0,
        },
      ],
      {
        ...baseCtx,
        edges: [
          {
            edgeType: '골드스윗크러스트',
            size: 'L',
            components: [{ quantity: 10, unitPrice: 100 }],
          },
          { edgeType: '씬도우', size: 'L', components: [{ quantity: 5, unitPrice: 20 }] },
        ],
      },
      catKeys,
      catMeta
    );

    const byCode = Object.fromEntries(report.edge.menus.map(m => [m.code, m]));
    expect(byCode['OPT-EDGE-003'].cost).toBe(1000); // 10 * 100
    expect(byCode['OPT-EDGE-004'].cost).toBe(100); // 5 * 20
    expect(report._diagnostics).toEqual([]);
  });

  test('석쇠는 cost_edge_dough에 행이 없어 원가 0이고, 미연결로 잡히지 않는다', () => {
    const report = buildCostReportData(
      [{ menuCode: 'OPT-EDGE-001', menuName: '석쇠', category: '엣지', size: '단일', price: 0 }],
      {
        ...baseCtx,
        edges: [{ edgeType: '치즈크러스트', size: 'L', components: [] }],
      },
      catKeys,
      catMeta
    );

    expect(report.edge.menus[0].cost).toBe(0);
    // matchEdge 카테고리는 diagnostics(원가 미연결) 대상에서 애초에 제외된다.
    expect(report._diagnostics).toEqual([]);
  });
});
