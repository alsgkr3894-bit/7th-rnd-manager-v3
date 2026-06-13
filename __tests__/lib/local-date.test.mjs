import { describe, expect, test } from '@jest/globals';
import {
  addLocalDays,
  formatLocalDateInput,
  formatLocalMonthInput,
  isDateInput,
} from '../../lib/date/local-date.js';

describe('local date helpers', () => {
  test('input date strings use local calendar fields instead of UTC slicing', () => {
    const date = new Date(2026, 5, 13, 0, 30);
    expect(formatLocalDateInput(date)).toBe('2026-06-13');
    expect(formatLocalMonthInput(date)).toBe('2026-06');
  });

  test('local day arithmetic preserves YYYY-MM-DD formatting', () => {
    const date = new Date(2026, 0, 1, 1, 0);
    expect(formatLocalDateInput(addLocalDays(date, -1))).toBe('2025-12-31');
  });

  test('date input validator only accepts YYYY-MM-DD', () => {
    expect(isDateInput('2026-06-13')).toBe(true);
    expect(isDateInput('2026-6-13')).toBe(false);
    expect(isDateInput(null)).toBe(false);
  });
});
