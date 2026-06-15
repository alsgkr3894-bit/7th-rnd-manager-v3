import {
  COST_BASE_UNITS,
  normalizeCostBaseUnit,
  normalizePurchaseQuantity,
  roundUnitPrice,
} from '../../lib/cost/unit-policy.js';
import { calcUnitPrice } from '../../lib/cost/calc-unit-price.js';

describe('cost unit policy', () => {
  test('입력 단위는 g와 개만 허용한다', () => {
    expect(COST_BASE_UNITS).toEqual(['g', '개']);
  });

  test('개수형 단위는 개로, 나머지는 g로 정규화한다', () => {
    expect(normalizeCostBaseUnit('EA')).toBe('개');
    expect(normalizeCostBaseUnit('PK')).toBe('개');
    expect(normalizeCostBaseUnit('봉')).toBe('개');
    expect(normalizeCostBaseUnit('kg')).toBe('g');
    expect(normalizeCostBaseUnit('')).toBe('g');
  });

  test('제때 수량은 g/개 기준으로 환산한다', () => {
    expect(normalizePurchaseQuantity(2.5, 'kg')).toEqual({ quantity: 2500, unit: 'g' });
    expect(normalizePurchaseQuantity(24, 'EA')).toEqual({ quantity: 24, unit: '개' });
    expect(normalizePurchaseQuantity(1000, 'g')).toEqual({ quantity: 1000, unit: 'g' });
  });

  test('부피 단위는 자동 환산하지 않는다', () => {
    expect(normalizePurchaseQuantity(1, 'L')).toBeNull();
    expect(normalizePurchaseQuantity(500, 'ml')).toBeNull();
  });

  test('단위 단가는 소수점 1자리로 반올림한다', () => {
    expect(roundUnitPrice(12.34)).toBe(12.3);
    expect(roundUnitPrice(12.35)).toBe(12.4);
    expect(calcUnitPrice(1234, 100)).toBe(12.3);
  });
});
