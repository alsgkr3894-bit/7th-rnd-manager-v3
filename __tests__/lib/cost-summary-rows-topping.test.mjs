import { describe, expect, test } from '@jest/globals';
import {
  buildRows,
  CAT_ORDER,
  detailStoreFor,
  normalizeCategory,
} from '@/lib/cost/shared/buildSummaryRows';

/**
 * 회귀 테스트: 전체 종합 원가표(/cost/all-summary)가 '추가토핑'을 '기타'로 뭉뚱그려
 * 원가 계산 자체를 건너뛰던 버그.
 */
describe('buildSummaryRows — 추가토핑', () => {
  test('normalizeCategory는 추가토핑을 기타가 아닌 추가토핑으로 분류한다', () => {
    expect(normalizeCategory('추가토핑')).toBe('추가토핑');
  });

  test('CAT_ORDER에 추가토핑이 세트박스 뒤·기타 앞에 있다', () => {
    expect(CAT_ORDER).toContain('추가토핑');
    const setIdx = CAT_ORDER.indexOf('세트박스');
    const toppingIdx = CAT_ORDER.indexOf('추가토핑');
    const etcIdx = CAT_ORDER.indexOf('기타');
    expect(toppingIdx).toBeGreaterThan(setIdx);
    expect(toppingIdx).toBeLessThan(etcIdx);
  });

  test('detailStoreFor는 추가토핑을 topping 맵으로 연결한다', () => {
    const maps = { pizza: 'P', personal: 'PE', side: 'S', set: 'SE', topping: 'T' };
    expect(detailStoreFor('추가토핑', maps)).toBe('T');
  });

  test('buildRows가 추가토핑 메뉴의 원가·원가율을 실제로 계산한다', () => {
    const menuPrices = [
      {
        menuCode: 'T-ETC-001',
        menuName: '치즈 80g',
        category: '추가토핑',
        size: '단일',
        price: 2000,
      },
    ];
    const detailMaps = {
      pizza: new Map(),
      personal: new Map(),
      side: new Map(),
      set: new Map(),
      topping: new Map([
        [
          'T-ETC-001',
          {
            menuCode: 'T-ETC-001',
            components: [{ productCode: 'C1', quantity: 80 }],
          },
        ],
      ]),
    };
    const unitPriceMap = new Map([['C1', { unitPrice: 5 }]]);

    const rows = buildRows(menuPrices, detailMaps, unitPriceMap);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      category: '추가토핑',
      cost: 400,
      hasCost: true,
    });
    expect(rows[0].costRate).toBeCloseTo(20);
  });
});
