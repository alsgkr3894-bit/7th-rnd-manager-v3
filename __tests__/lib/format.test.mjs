import { formatNumber, formatPercent } from '../../lib/format.js';

describe('formatNumber', () => {
  test('숫자 천 단위 구분', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1234567)).toBe('1,234,567');
  });
  test('null/undefined 는 "0" 반환 (현재 구현)', () => {
    // 실제 구현: n == null || isNaN(n) 이면 '0' 반환
    expect(formatNumber(null)).toBe('0');
    expect(formatNumber(undefined)).toBe('0');
  });
  test('소수점 자리 지정', () => {
    expect(formatNumber(1234.5, 1)).toBe('1,234.5');
  });
  test('0 처리', () => {
    expect(formatNumber(0)).toBe('0');
  });
});

describe('formatPercent', () => {
  test('기본 소수점 1자리', () => {
    expect(formatPercent(12.5)).toBe('12.5%');
    expect(formatPercent(0)).toBe('0.0%');
  });
  test('null/NaN 은 "-" 반환', () => {
    expect(formatPercent(null)).toBe('-');
    expect(formatPercent(NaN)).toBe('-');
  });
  test('undefined 는 "-" 반환', () => {
    expect(formatPercent(undefined)).toBe('-');
  });
  test('소수점 자리 지정', () => {
    expect(formatPercent(33.333, 2)).toBe('33.33%');
  });
  test('100% 처리', () => {
    expect(formatPercent(100)).toBe('100.0%');
  });
});
