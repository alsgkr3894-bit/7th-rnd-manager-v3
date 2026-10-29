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

  describe('코드 없는 옛 구성품 — 이름으로 최신 단가 연결 (해남고구마무스 사례)', () => {
    const entry = (name, unitPrice, extra = {}) => ({ ingredientName: name, unitPrice, ...extra });
    const legacy = { ingredientName: '해남 고구마무스', quantity: 100, unitPrice: 8.69 };

    test('사용 중인 식자재 이름이 하나뿐이면 최신 단가를 따른다(공백·대소문자 무시)', () => {
      const unitPriceMap = new Map([['152', entry('해남고구마무스', 10)]]);
      expect(componentEffectiveUnitPrice(legacy, unitPriceMap)).toBe(10);
      expect(effectiveComponentsCost([legacy], unitPriceMap)).toBe(1000);
    });

    test('단가 맵이 바뀌면(크기 변화) 색인도 새로 만든다', () => {
      const unitPriceMap = new Map([['152', entry('해남고구마무스', 10)]]);
      expect(componentEffectiveUnitPrice(legacy, unitPriceMap)).toBe(10);
      unitPriceMap.set('999', entry('해남고구마무스', 20));
      expect(componentEffectiveUnitPrice(legacy, unitPriceMap)).toBe(8.69);
    });

    test('같은 이름이 둘이면 연결하지 않고 저장 단가를 쓴다', () => {
      const unitPriceMap = new Map([
        ['152', entry('해남고구마무스', 10)],
        ['153', entry('해남고구마무스', 20)],
      ]);
      expect(componentEffectiveUnitPrice(legacy, unitPriceMap)).toBe(8.69);
    });

    test('단종·제외 식자재와는 연결하지 않는다', () => {
      expect(
        componentEffectiveUnitPrice(
          legacy,
          new Map([['152', entry('해남고구마무스', 10, { discontinued: true })]])
        )
      ).toBe(8.69);
      expect(
        componentEffectiveUnitPrice(
          legacy,
          new Map([['152', entry('해남고구마무스', 10, { excluded: true })]])
        )
      ).toBe(8.69);
    });

    test('이름이 일치하는 식자재가 없거나 이미 코드가 있으면 기존 규칙 그대로', () => {
      const unitPriceMap = new Map([['152', entry('해남고구마무스', 10)]]);
      expect(
        componentEffectiveUnitPrice({ ingredientName: '없는 재료', unitPrice: 3 }, unitPriceMap)
      ).toBe(3);
      expect(componentEffectiveUnitPrice({ ...legacy, productCode: 'MISSING' }, unitPriceMap)).toBe(
        8.69
      );
    });
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
