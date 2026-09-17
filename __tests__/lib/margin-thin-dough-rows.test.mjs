import { describe, expect, test } from '@jest/globals';
import {
  defaultExpandInMargin,
  defaultMarginSuffix,
  normalizeMarginSuffix,
} from '../../lib/cost/edge-dough/template.js';
import { buildDerivedRows, buildEdgeMetadata } from '../../lib/cost/margin/build-rows.js';

describe('margin thin dough rows', () => {
  test('thin dough defaults to visible margin rows with a stable suffix', () => {
    expect(defaultExpandInMargin('씬도우')).toBe(true);
    expect(defaultMarginSuffix('씬도우')).toBe('s');
    expect(normalizeMarginSuffix('씬도우', '씬')).toBe('s');
    expect(normalizeMarginSuffix('씬도우', 'T')).toBe('s');
    expect(normalizeMarginSuffix('씬도우', 'TH')).toBe('s');
  });

  test('legacy thin dough records saved as expandInMargin=false still appear in margin metadata', () => {
    const meta = buildEdgeMetadata(
      [
        {
          edgeType: '씬도우',
          size: 'L',
          expandInMargin: false,
          components: [{ quantity: 10, unitPrice: 25 }],
        },
      ],
      [{ category: '엣지', menuName: '씬도우', price: 1000 }]
    );

    expect(meta.EXPAND_EDGES).toEqual(['씬도우']);
    expect(meta.edgeSuffixByType).toEqual({ 씬도우: 's' });
    expect(meta.edgeCostByType).toEqual({ 씬도우: { L: 250 } });
    expect(meta.edgePriceByType).toEqual({ 씬도우: 1000 });
  });

  test('메뉴마스터 엣지 판매가 이름이 edgeType과 완전히 같지 않아도 패밀리로 매칭한다 (실사용 오탐 재현)', () => {
    // 실데이터: menu_master/cost_selling_prices 이름 '골드스윗'·'씬바사삭' vs
    // cost_edge_dough edgeType '골드스윗크러스트'·'씬도우' — 예전엔 정확 일치만 봐서
    // 골드스윗 파생행에 판매가가 안 붙었다(원가율이 실제보다 낮게 나옴).
    const meta = buildEdgeMetadata(
      [
        { edgeType: '골드스윗크러스트', size: 'L', components: [{ quantity: 10, unitPrice: 100 }] },
        { edgeType: '씬도우', size: 'L', components: [{ quantity: 5, unitPrice: 20 }] },
      ],
      [
        { category: '엣지', menuName: '골드스윗', price: 4000 },
        { category: '엣지', menuName: '씬바사삭', price: 1500 },
      ]
    );

    expect(meta.edgePriceByType).toEqual({ 골드스윗크러스트: 4000, 씬도우: 1500 });
  });

  test('thin dough metadata creates derived margin rows', () => {
    const meta = buildEdgeMetadata(
      [
        {
          edgeType: '씬도우',
          size: 'L',
          expandInMargin: false,
          components: [{ quantity: -20, unitPrice: 10 }],
        },
      ],
      []
    );

    const rows = buildDerivedRows(
      [
        {
          id: 'detail||P-001-L',
          menuCode: 'P-001-L',
          menuCodes: ['P-001-L', 'P-001-R'],
          menuName: '테스트피자',
          menuCategory: '피자',
          sizes: [{ label: 'L', sellingPrice: 18000 }],
          costMap: { L: 5000 },
        },
      ],
      meta,
      new Set()
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      menuCode: 'P-001-L-s',
      menuCodes: ['P-001-L', 'P-001-R'],
      sourceRowId: 'detail||P-001-L',
      sourceMenuCode: 'P-001-L',
      isDerivedEdge: true,
      edgeType: '씬도우',
      menuName: '테스트피자 씬도우',
      costMap: { L: 4800 },
      sizes: [{ label: 'L', sellingPrice: 18000 }],
    });
  });

  test('legacy thin dough margin suffix saved as Korean text still becomes -s', () => {
    const meta = buildEdgeMetadata(
      [
        {
          edgeType: '씬도우',
          size: 'L',
          marginSuffix: '씬',
          components: [],
        },
      ],
      []
    );

    const rows = buildDerivedRows(
      [
        {
          id: 'detail||P-002-L',
          menuCode: 'P-002-L',
          menuName: '레거시피자',
          menuCategory: '피자',
          sizes: [{ label: 'L', sellingPrice: 18000 }],
          costMap: { L: 5000 },
        },
      ],
      meta,
      new Set()
    );

    expect(meta.edgeSuffixByType).toEqual({ 씬도우: 's' });
    expect(rows[0].menuCode).toBe('P-002-L-s');
  });
});
