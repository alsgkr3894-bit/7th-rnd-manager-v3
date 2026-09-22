/**
 * lib/menu-master/edge-size-split.js — 치즈크러스트·골드스윗 메뉴마스터 행을 L/R로 나누는
 * 정규화(2026-09-22 정책: 추가 요금 L 5,000 / R 4,000). 석쇠·씬바사삭은 그대로.
 */
import { describe, expect, test } from '@jest/globals';
import { planEdgeSizeSplit, EDGE_SIZE_PRICES } from '../../lib/menu-master/edge-size-split.js';
import { summarizeMenuEdge } from '../../lib/menu-master/recipe-summary.js';

const EDGE_ROWS = [
  {
    id: 1,
    menuCode: 'OPT-EDGE-001',
    category: '엣지',
    menuName: '석쇠',
    price: 0,
    displayOrder: 9010,
  },
  {
    id: 2,
    menuCode: 'OPT-EDGE-002',
    category: '엣지',
    menuName: '치즈크러스트',
    price: 4000,
    status: 'active',
    displayOrder: 9020,
  },
  {
    id: 3,
    menuCode: 'OPT-EDGE-003',
    category: '엣지',
    menuName: '골드스윗',
    price: 4000,
    status: 'active',
    displayOrder: 9030,
  },
  {
    id: 4,
    menuCode: 'OPT-EDGE-004',
    category: '엣지',
    menuName: '씬바사삭',
    price: 0,
    displayOrder: 9040,
  },
];

describe('planEdgeSizeSplit', () => {
  test('치즈크러스트·골드스윗 단일 행을 L(기존 id 유지)·R(신규) 두 행으로 나누고 사이즈별 가격을 넣는다', () => {
    const plan = planEdgeSizeSplit(EDGE_ROWS);

    expect(plan.removedCodes).toEqual(['OPT-EDGE-002', 'OPT-EDGE-003']);
    expect(plan.updates).toHaveLength(2);
    expect(plan.inserts).toHaveLength(2);
    expect(plan.updates[0]).toMatchObject({
      id: 2,
      menuCode: 'OPT-EDGE-002-L',
      menuName: '치즈크러스트 L',
      size: 'L',
      price: EDGE_SIZE_PRICES.치즈크러스트.L,
      edgeKey: '치즈크러스트',
      status: 'active',
    });
    expect(plan.inserts[0]).toMatchObject({
      menuCode: 'OPT-EDGE-002-R',
      menuName: '치즈크러스트 R',
      size: 'R',
      price: EDGE_SIZE_PRICES.치즈크러스트.R,
      displayOrder: 9021,
    });
    expect(plan.inserts[0]).not.toHaveProperty('id');
    expect(EDGE_SIZE_PRICES).toEqual({
      치즈크러스트: { L: 5000, R: 4000 },
      골드스윗: { L: 5000, R: 4000 },
    });
  });

  test('석쇠·씬바사삭은 건드리지 않고, 이미 L/R 행이 있는 패밀리는 다시 나누지 않는다(멱등)', () => {
    const already = [
      EDGE_ROWS[0],
      { ...EDGE_ROWS[1], menuCode: 'OPT-EDGE-002-L', size: 'L', price: 5000 },
      {
        id: 5,
        menuCode: 'OPT-EDGE-002-R',
        category: '엣지',
        menuName: '치즈크러스트 R',
        size: 'R',
        price: 4000,
      },
      EDGE_ROWS[3],
    ];
    const plan = planEdgeSizeSplit(already);

    expect(plan.updates).toEqual([]);
    expect(plan.inserts).toEqual([]);
    expect(plan.removedCodes).toEqual([]);
  });
});

describe('summarizeMenuEdge — 사이즈 행', () => {
  const edges = [
    { edgeType: '치즈크러스트', size: 'L', components: [{ quantity: 1, unitPrice: 1559 }] },
    { edgeType: '치즈크러스트', size: 'R', components: [{ quantity: 1, unitPrice: 1421 }] },
  ];

  test('R 행은 R 원가와 R 판매가로 원가율을 낸다', () => {
    const summary = summarizeMenuEdge(
      { category: '엣지', menuName: '치즈크러스트 R', size: 'R', price: 4000 },
      edges
    );
    expect(summary.size).toBe('R');
    expect(summary.totalCost).toBe(1421);
    expect(summary.costRate).toBeCloseTo((1421 / 4000) * 100, 5);
    expect(summary.sizeCosts).toEqual({ L: 1559, R: 1421 });
  });

  test('사이즈 없는 옛 행은 종전처럼 L 원가를 대표값으로 쓴다', () => {
    const summary = summarizeMenuEdge(
      { category: '엣지', menuName: '치즈크러스트', price: 4000 },
      edges
    );
    expect(summary.size).toBeNull();
    expect(summary.totalCost).toBe(1559);
  });
});
