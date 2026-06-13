import { describe, expect, test } from '@jest/globals';
import {
  normalizePeriodMode,
  normalizeScope,
  safeMonth,
  safePercentWidth,
  safeQuantity,
  safeYear,
} from '../../lib/report/period.js';

describe('report period helpers', () => {
  test('연/월 입력은 허용 범위 밖이면 fallback을 쓴다', () => {
    expect(safeYear('2026')).toBe(2026);
    expect(safeYear('1800', 2025)).toBe(2025);
    expect(safeMonth('6')).toBe(6);
    expect(safeMonth('13', 12)).toBe(12);
  });

  test('수량과 비율 폭은 숫자 방어를 공유한다', () => {
    expect(safeQuantity('12')).toBe(12);
    expect(safeQuantity('bad')).toBe(0);
    expect(safePercentWidth(25, 100)).toBe(25);
    expect(safePercentWidth(-50, 100)).toBe(50);
    expect(safePercentWidth(10, 0)).toBe(0);
  });

  test('보고서 옵션 값은 지원 목록으로 정규화한다', () => {
    expect(normalizeScope('피자')).toBe('피자');
    expect(normalizeScope('1인피자')).toBe('1인피자');
    expect(normalizeScope('unknown')).toBe('all');
    expect(normalizePeriodMode('year')).toBe('year');
    expect(normalizePeriodMode('quarter')).toBe('month');
  });
});
