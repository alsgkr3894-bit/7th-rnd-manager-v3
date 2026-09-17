import { describe, expect, test } from '@jest/globals';
import {
  MENU_RECIPE_SUMMARY_STATUS,
  summarizeMenuEdge,
  summarizeMenuRecipe,
} from '../../lib/menu-master/recipe-summary.js';

/**
 * 회귀 테스트: 메뉴마스터 카테고리 '엣지' 행은 menu_recipes가 아니라
 * cost_edge_dough(엣지 관리)의 사이즈별 원가를 보여줘야 한다 — 예전엔 항상
 * UNSUPPORTED('미지원')였다.
 */
describe('summarizeMenuEdge', () => {
  const edges = [
    { edgeType: '치즈크러스트', size: 'L', components: [{ quantity: 10, unitPrice: 155.935 }] },
    { edgeType: '치즈크러스트', size: 'R', components: [{ quantity: 10, unitPrice: 142.094 }] },
    { edgeType: '골드스윗크러스트', size: 'L', components: [{ quantity: 1, unitPrice: 1000 }] },
  ];

  test('엣지 카테고리가 아니면 null', () => {
    expect(summarizeMenuEdge({ category: '피자', menuName: '치즈크러스트' }, edges)).toBeNull();
  });

  test('실데이터 이름이 edgeType과 완전히 같지 않아도 L/R 원가를 찾는다 (치즈크러스트)', () => {
    const summary = summarizeMenuEdge(
      { category: '엣지', menuName: '치즈크러스트', price: 4000 },
      edges
    );
    expect(summary).toMatchObject({
      status: MENU_RECIPE_SUMMARY_STATUS.EDGE,
      hasRecipe: true,
      edgeFamilyKey: '치즈크러스트',
      sizeCosts: { L: 1559, R: 1421 },
      totalCost: 1559,
    });
    expect(summary.costRate).toBeCloseTo((1559 / 4000) * 100, 1);
  });

  test('R 사이즈가 없는 패밀리는 sizeCosts에 L만 있다 (골드스윗)', () => {
    const summary = summarizeMenuEdge({ category: '엣지', menuName: '골드스윗' }, edges);
    expect(summary.sizeCosts).toEqual({ L: 1000 });
    expect(summary.totalCost).toBe(1000);
  });

  test('석쇠는 cost_edge_dough에 행이 없어도 hasRecipe:true, 원가 0으로 취급한다', () => {
    const summary = summarizeMenuEdge({ category: '엣지', menuName: '석쇠', price: 0 }, edges);
    expect(summary).toMatchObject({
      status: MENU_RECIPE_SUMMARY_STATUS.EDGE,
      hasRecipe: true,
      edgeFamilyKey: '석쇠',
      sizeCosts: {},
      totalCost: 0,
      costRate: null,
    });
  });

  test('cost_edge_dough에 아직 아무 사이즈도 없는 패밀리는 hasRecipe:false', () => {
    const summary = summarizeMenuEdge({ category: '엣지', menuName: '씬바사삭' }, []);
    expect(summary).toMatchObject({
      status: MENU_RECIPE_SUMMARY_STATUS.EDGE,
      hasRecipe: false,
      edgeFamilyKey: '씬바사삭',
      sizeCosts: {},
      totalCost: 0,
    });
  });

  test('알 수 없는 이름은 null', () => {
    expect(summarizeMenuEdge({ category: '엣지', menuName: '알수없음' }, edges)).toBeNull();
  });
});

describe('summarizeMenuRecipe — 엣지 카테고리는 edges 옵션으로 EDGE 상태를 반환한다', () => {
  test('kind가 없고(레시피 미지원 카테고리) 엣지로 판정되면 EDGE 상태', () => {
    const summary = summarizeMenuRecipe(
      { category: '엣지', menuName: '치즈크러스트', price: 4000 },
      null,
      new Map(),
      {
        edges: [
          { edgeType: '치즈크러스트', size: 'L', components: [{ quantity: 1, unitPrice: 1559 }] },
        ],
      }
    );
    expect(summary.status).toBe(MENU_RECIPE_SUMMARY_STATUS.EDGE);
    expect(summary.hasRecipe).toBe(true);
  });

  test('엣지로도 판정되지 않는 미지원 카테고리는 여전히 UNSUPPORTED', () => {
    const summary = summarizeMenuRecipe(
      { category: '기타', menuName: '아무거나' },
      null,
      new Map()
    );
    expect(summary.status).toBe(MENU_RECIPE_SUMMARY_STATUS.UNSUPPORTED);
    expect(summary.hasRecipe).toBe(false);
  });
});
