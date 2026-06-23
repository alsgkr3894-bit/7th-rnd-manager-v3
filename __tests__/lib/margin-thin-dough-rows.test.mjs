import { describe, expect, test } from '@jest/globals';
import { defaultExpandInMargin, defaultMarginSuffix } from '../../lib/cost/edge-dough/template.js';
import { buildDerivedRows, buildEdgeMetadata } from '../../lib/cost/margin/build-rows.js';

describe('margin thin dough rows', () => {
  test('thin dough defaults to visible margin rows with a stable suffix', () => {
    expect(defaultExpandInMargin('씬도우')).toBe(true);
    expect(defaultMarginSuffix('씬도우')).toBe('T');
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
    expect(meta.edgeSuffixByType).toEqual({ 씬도우: 'T' });
    expect(meta.edgeCostByType).toEqual({ 씬도우: { L: 250 } });
    expect(meta.edgePriceByType).toEqual({ 씬도우: 1000 });
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
      menuCode: 'P-001-L-T',
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
});
