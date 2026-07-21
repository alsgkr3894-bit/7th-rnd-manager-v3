import { describe, expect, test } from '@jest/globals';
import { shiftMonthYear } from '../../app/note/calendar/useCalendarNavigation.js';

describe('shiftMonthYear', () => {
  test('같은 해 안에서는 월만 이동한다', () => {
    expect(shiftMonthYear({ year: 2026, month: 6 }, 1)).toEqual({ year: 2026, month: 7 });
    expect(shiftMonthYear({ year: 2026, month: 6 }, -1)).toEqual({ year: 2026, month: 5 });
  });

  test('12월에서 다음 달로 이동하면 해가 정확히 1만 증가한다', () => {
    expect(shiftMonthYear({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
  });

  test('1월에서 이전 달로 이동하면 해가 정확히 1만 감소한다', () => {
    expect(shiftMonthYear({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });

  test('연속으로 12번 다음 달 이동하면 정확히 1년만 증가한다', () => {
    let view = { year: 2026, month: 1 };
    for (let i = 0; i < 12; i++) {
      view = shiftMonthYear(view, 1);
    }
    expect(view).toEqual({ year: 2027, month: 1 });
  });
});
