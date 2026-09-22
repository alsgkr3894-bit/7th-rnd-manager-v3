/**
 * lib/cost/edge-dough/calc.js edgeTotalCost — 2026-09-22.
 *
 * 엣지 원가가 저장된 component.unitPrice에만 의존해, 식자재 단가가 새 제때 업로드로
 * 바뀌어도 EdgeEditModal에서 재저장하기 전까지 낡은 값을 계속 보여주던 문제를 고쳤다.
 * unitPriceMap을 주면 최신 제때 단가로 다시 계산하고, 안 주면(편집 폼 실시간 미리보기)
 * 저장된 값을 그대로 합산하는 기존 동작을 유지한다.
 */
import { describe, expect, test } from '@jest/globals';
import { edgeTotalCost } from '../../lib/cost/edge-dough/calc.js';

describe('edgeTotalCost', () => {
  test('unitPriceMap이 없으면 저장된 component.unitPrice로 합산한다(편집 중 미리보기와 동일)', () => {
    const edge = {
      components: [
        { productCode: 'ING-1', quantity: 2, unitPrice: 100 },
        { productCode: 'ING-2', quantity: 3, unitPrice: 50 },
      ],
    };
    expect(edgeTotalCost(edge)).toBe(350);
  });

  test('unitPriceMap을 주면 저장된 unitPrice 대신 최신 단가로 다시 계산한다', () => {
    const edge = {
      components: [
        { productCode: 'ING-1', quantity: 2, unitPrice: 100 }, // 낡은 저장값
        { productCode: 'ING-2', quantity: 3, unitPrice: 50 },
      ],
    };
    const unitPriceMap = new Map([
      ['ING-1', { unitPrice: 150 }], // 최신 제때 단가로 인상됨
    ]);
    // ING-1: 2 * 150(최신) = 300, ING-2: unitPriceMap에 없어 저장값 3 * 50 = 150
    expect(edgeTotalCost(edge, unitPriceMap)).toBe(450);
  });

  test('구성품이 없으면 unitPriceMap 유무와 관계없이 0이다', () => {
    expect(edgeTotalCost({ components: [] })).toBe(0);
    expect(edgeTotalCost({ components: [] }, new Map())).toBe(0);
    expect(edgeTotalCost(null, new Map())).toBe(0);
  });

  test('productCode 없는 구성품은 unitPriceMap이 있어도 저장된 unitPrice를 그대로 쓴다', () => {
    const edge = { components: [{ ingredientName: '무코드 재료', quantity: 1, unitPrice: 700 }] };
    expect(edgeTotalCost(edge, new Map([['다른코드', { unitPrice: 999 }]]))).toBe(700);
  });
});
