import {
  fmtShort,
  formatNumber,
  formatPercent,
  formatPeriodKor,
  formatUnitPrice,
  normalizeFiniteNumber,
  normalizeFractionDigits,
  parseAmount,
  roundTo,
} from '../../lib/format.js';

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
  test('Infinity와 비정상 소수점 자리는 안전하게 보정', () => {
    expect(formatNumber(Infinity)).toBe('0');
    expect(formatNumber(1234.56, -1)).toBe('1,235');
    expect(formatNumber(1234.56, 'bad')).toBe('1,235');
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
  test('Infinity와 비정상 소수점 자리는 안전하게 보정', () => {
    expect(formatPercent(Infinity)).toBe('-');
    expect(formatPercent(12.34, -1)).toBe('12%');
    expect(formatPercent(12.34, 'bad')).toBe('12.3%');
  });
});

describe('format guards', () => {
  test('normalizeFiniteNumber는 유한 숫자만 보존한다', () => {
    expect(normalizeFiniteNumber('12.5', 0)).toBe(12.5);
    expect(normalizeFiniteNumber(Infinity, 7)).toBe(7);
    expect(normalizeFiniteNumber('bad', 7)).toBe(7);
  });

  test('normalizeFractionDigits는 Intl/toFixed 허용 범위로 제한한다', () => {
    expect(normalizeFractionDigits(2.8, 0)).toBe(2);
    expect(normalizeFractionDigits(-1, 0)).toBe(0);
    expect(normalizeFractionDigits(30, 0)).toBe(20);
    expect(normalizeFractionDigits('bad', 3)).toBe(3);
  });

  test('parseAmount는 비정상 금액을 0으로 처리한다', () => {
    expect(parseAmount('1,200원')).toBe(1200);
    expect(parseAmount('Infinity')).toBe(0);
    expect(parseAmount('bad')).toBe(0);
  });

  test('fmtShort는 비정상 숫자를 0으로 처리한다', () => {
    expect(fmtShort(120000000)).toBe('1.2억');
    expect(fmtShort(Infinity)).toBe('0');
  });

  test('roundTo는 비정상 숫자와 자리수를 안전하게 보정한다', () => {
    expect(roundTo(12.345, 2)).toBe(12.35);
    expect(roundTo('bad', 2)).toBe(0);
    expect(roundTo(12.345, -1)).toBe(12);
  });

  test('formatUnitPrice는 문자열 숫자를 허용하고 비정상 단가는 null로 처리한다', () => {
    expect(formatUnitPrice('0.85', 'g')).toBe('0.85원/g');
    expect(formatUnitPrice(12.5, 'g')).toBe('12.5원/g');
    expect(formatUnitPrice('bad', 'g')).toBeNull();
    expect(formatUnitPrice(10, null)).toBe('10원');
  });

  test('formatPeriodKor는 유효한 년월만 표시한다', () => {
    expect(formatPeriodKor({ year: 2026, month: 5 })).toBe('2026년 5월');
    expect(formatPeriodKor({ year: '2026', month: '05' })).toBe('2026년 5월');
    expect(formatPeriodKor({ year: 2026, month: 13 })).toBe('-');
    expect(formatPeriodKor({ year: { value: 2026 }, month: 5 })).toBe('-');
  });
});
