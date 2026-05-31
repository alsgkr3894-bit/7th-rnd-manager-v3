import { calcMarginRate } from '../../lib/recipe/index.js';

describe('마진율 경계값', () => {
  test('100% 원가율 (원가=판매가)', () => {
    expect(calcMarginRate(10000, 10000)).toBe(100);
  });
  test('소수점 정밀도', () => {
    const result = calcMarginRate(3333, 10000);
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThan(33);
    expect(result).toBeLessThan(34);
  });
  test('50% 원가율', () => {
    expect(calcMarginRate(5000, 10000)).toBe(50);
  });
  test('아주 작은 원가 (정밀도 유지)', () => {
    const result = calcMarginRate(1, 10000);
    expect(result).toBeCloseTo(0.01, 5);
  });
  test('정수 결과 — 소수점 없음', () => {
    expect(calcMarginRate(2500, 10000)).toBe(25);
  });
});
