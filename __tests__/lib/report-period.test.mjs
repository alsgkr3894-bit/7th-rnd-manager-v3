import { describe, expect, test } from '@jest/globals';
import {
  formatPeriodLabel,
  monthsInPeriod,
  normalizeYearMonth,
  normalizePeriodMode,
  normalizeScope,
  periodCompareLabel,
  previousPeriod,
  quarterOfMonth,
  monthsOfQuarter,
  safeMonth,
  safePercentWidth,
  safeQuantity,
  safeQuarter,
  safeYear,
} from '../../lib/report/period.js';

describe('report period helpers', () => {
  test('연/월 입력은 허용 범위 밖이면 fallback을 쓴다', () => {
    expect(safeYear('2026')).toBe(2026);
    expect(safeYear('1800', 2025)).toBe(2025);
    expect(safeMonth('6')).toBe(6);
    expect(safeMonth('13', 12)).toBe(12);
  });

  test('strict 기간 정규화는 유효한 연/월만 반환한다', () => {
    expect(normalizeYearMonth({ year: '2026', month: '06' })).toEqual({ year: 2026, month: 6 });
    expect(normalizeYearMonth({ year: 1899, month: 6 })).toBeNull();
    expect(normalizeYearMonth({ year: 2026, month: 13 })).toBeNull();
    expect(normalizeYearMonth(null)).toBeNull();
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
    expect(normalizeScope('pizza')).toBe('피자');
    expect(normalizeScope('side')).toBe('사이드');
    expect(normalizeScope('unknown')).toBe('all');
    expect(normalizePeriodMode('year')).toBe('year');
    expect(normalizePeriodMode('quarter')).toBe('quarter');
    expect(normalizePeriodMode('bogus')).toBe('month');
  });
});

describe('분기 헬퍼', () => {
  test('safeQuarter는 1~4 범위 밖이면 fallback을 쓴다', () => {
    expect(safeQuarter('3')).toBe(3);
    expect(safeQuarter('5', 2)).toBe(2);
    expect(safeQuarter('0', 1)).toBe(1);
  });

  test('quarterOfMonth는 월을 분기로 변환한다', () => {
    expect(quarterOfMonth(1)).toBe(1);
    expect(quarterOfMonth(3)).toBe(1);
    expect(quarterOfMonth(4)).toBe(2);
    expect(quarterOfMonth(9)).toBe(3);
    expect(quarterOfMonth(12)).toBe(4);
  });

  test('monthsOfQuarter는 분기에 속한 월 3개를 반환한다', () => {
    expect(monthsOfQuarter(1)).toEqual([1, 2, 3]);
    expect(monthsOfQuarter(2)).toEqual([4, 5, 6]);
    expect(monthsOfQuarter(3)).toEqual([7, 8, 9]);
    expect(monthsOfQuarter(4)).toEqual([10, 11, 12]);
  });
});

describe('monthsInPeriod', () => {
  test('month 모드는 해당 월 하나만 반환한다', () => {
    expect(monthsInPeriod('month', 2026, 5)).toEqual([{ year: 2026, month: 5 }]);
  });

  test('quarter 모드는 해당 분기의 월 3개를 반환한다', () => {
    expect(monthsInPeriod('quarter', 2026, 2)).toEqual([
      { year: 2026, month: 4 },
      { year: 2026, month: 5 },
      { year: 2026, month: 6 },
    ]);
  });

  test('year 모드는 12개월 전체를 반환한다', () => {
    const months = monthsInPeriod('year', 2026, null);
    expect(months).toHaveLength(12);
    expect(months[0]).toEqual({ year: 2026, month: 1 });
    expect(months[11]).toEqual({ year: 2026, month: 12 });
  });
});

describe('previousPeriod', () => {
  test('month 모드: 1월이면 작년 12월로 넘어간다', () => {
    expect(previousPeriod('month', 2026, 1)).toEqual({ year: 2025, monthOrQuarter: 12 });
    expect(previousPeriod('month', 2026, 5)).toEqual({ year: 2026, monthOrQuarter: 4 });
  });

  test('quarter 모드: 1분기면 작년 4분기로 넘어간다', () => {
    expect(previousPeriod('quarter', 2026, 1)).toEqual({ year: 2025, monthOrQuarter: 4 });
    expect(previousPeriod('quarter', 2026, 3)).toEqual({ year: 2026, monthOrQuarter: 2 });
  });

  test('year 모드: 작년으로 넘어간다', () => {
    expect(previousPeriod('year', 2026, null)).toEqual({ year: 2025, monthOrQuarter: null });
  });
});

describe('periodCompareLabel / formatPeriodLabel', () => {
  test('periodMode별 비교 라벨을 반환한다', () => {
    expect(periodCompareLabel('month')).toBe('전월');
    expect(periodCompareLabel('quarter')).toBe('전분기');
    expect(periodCompareLabel('year')).toBe('전년');
  });

  test('periodMode별 기간 표시 문자열을 만든다', () => {
    expect(formatPeriodLabel('month', 2026, 3)).toBe('2026년 3월');
    expect(formatPeriodLabel('quarter', 2026, 2)).toBe('2026년 2분기');
    expect(formatPeriodLabel('year', 2026, null)).toBe('2026년');
  });
});
