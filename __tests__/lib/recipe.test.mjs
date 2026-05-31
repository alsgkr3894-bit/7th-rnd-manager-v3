import { calcMarginRate } from '../../lib/recipe/index.js';

describe('calcMarginRate', () => {
  test('기본 원가율 계산', () => {
    expect(calcMarginRate(3000, 10000)).toBe(30);
  });
  test('0으로 나누기 방어 — sellingPrice=0 은 null', () => {
    expect(calcMarginRate(3000, 0)).toBeNull();
  });
  test('음수 sellingPrice 는 null', () => {
    expect(calcMarginRate(3000, -1)).toBeNull();
  });
  test('cost=0 이면 원가율 0', () => {
    expect(calcMarginRate(0, 10000)).toBe(0);
  });
  test('sellingPrice=null 은 null', () => {
    // !null → true → null 반환
    expect(calcMarginRate(3000, null)).toBeNull();
  });
  test('cost=null 은 NaN 이 아닌 0 (JS null/number 연산)', () => {
    // null / 10000 * 100 === 0 (JS 형 변환)
    expect(calcMarginRate(null, 10000)).toBe(0);
  });
  test('100% 원가율 (원가=판매가)', () => {
    expect(calcMarginRate(10000, 10000)).toBe(100);
  });
  test('소수점 정밀도', () => {
    const result = calcMarginRate(3333, 10000);
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThan(33);
    expect(result).toBeLessThan(34);
  });
});
