import { describe, expect, test } from '@jest/globals';
import { getKrHolidayName, isKrHoliday, KR_HOLIDAYS } from '../../lib/note/kr-holidays.js';

describe('kr-holidays', () => {
  test('등록된 연도의 고정/음력 공휴일 이름을 반환한다', () => {
    expect(getKrHolidayName('2026-01-01')).toBe('신정');
    expect(getKrHolidayName('2026-09-25')).toBe('추석');
    expect(getKrHolidayName('2026-03-02')).toBe('대체공휴일(삼일절)');
    expect(getKrHolidayName('2025-05-05')).toBe('어린이날·부처님오신날');
  });

  test('공휴일이 아닌 날짜와 표 밖 연도는 null을 반환한다', () => {
    expect(getKrHolidayName('2026-06-16')).toBeNull();
    expect(getKrHolidayName('2035-01-01')).toBeNull();
    expect(getKrHolidayName('')).toBeNull();
    expect(getKrHolidayName(undefined)).toBeNull();
  });

  test('isKrHoliday는 boolean으로 변환한다', () => {
    expect(isKrHoliday('2026-12-25')).toBe(true);
    expect(isKrHoliday('2026-12-24')).toBe(false);
  });

  test('등록된 모든 연도의 값은 문자열이다', () => {
    for (const year of Object.keys(KR_HOLIDAYS)) {
      for (const name of Object.values(KR_HOLIDAYS[year])) {
        expect(typeof name).toBe('string');
        expect(name.length).toBeGreaterThan(0);
      }
    }
  });
});
