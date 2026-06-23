import { describe, expect, test } from '@jest/globals';
import {
  componentEffectiveUnitPrice,
  effectiveComponentSubtotal,
  effectiveComponentsCost,
  effectiveComponentsRawCost,
} from '../../lib/cost/shared/effective-cost.js';

describe('effective cost helpers', () => {
  test('제품코드가 있으면 최신 단가맵을 저장 단가보다 우선한다', () => {
    const unitPriceMap = new Map([['ING-1', { unitPrice: 12.5, baseUnitType: 'g' }]]);
    const component = { productCode: 'ING-1', quantity: 10, unitPrice: 999 };

    expect(componentEffectiveUnitPrice(component, unitPriceMap)).toBe(12.5);
    expect(effectiveComponentSubtotal(component, unitPriceMap)).toBe(125);
  });

  test('제품코드 최신 단가가 없으면 구성품 저장 단가를 사용한다', () => {
    expect(componentEffectiveUnitPrice({ productCode: 'MISSING', unitPrice: 7 }, new Map())).toBe(
      7
    );
    expect(effectiveComponentsRawCost([{ quantity: 3, unitPrice: 7 }], new Map())).toBe(21);
    expect(effectiveComponentsCost([{ quantity: 2.5, unitPrice: 10.2 }], new Map())).toBe(26);
  });

  test('negative quantity subtracts from effective component cost', () => {
    expect(effectiveComponentSubtotal({ quantity: -3, unitPrice: 7 }, new Map())).toBe(-21);
    expect(
      effectiveComponentsRawCost(
        [
          { quantity: 10, unitPrice: 7 },
          { quantity: -3, unitPrice: 7 },
        ],
        new Map()
      )
    ).toBe(49);
  });

  test('수량 또는 단가가 비정상이면 0으로 계산한다', () => {
    expect(effectiveComponentSubtotal({ quantity: '', unitPrice: 10 }, new Map())).toBe(0);
    expect(effectiveComponentSubtotal({ quantity: 1, unitPrice: 'bad' }, new Map())).toBe(0);
  });
});
