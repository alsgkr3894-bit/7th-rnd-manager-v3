import { describe, expect, test } from '@jest/globals';

const { parseNoteQuickDate } = await import('../../lib/note/date-input.js');

describe('note quick date input', () => {
  test('compact test dates are normalized for historical data entry', () => {
    expect(parseNoteQuickDate('240502')).toBe('2024-05-02');
    expect(parseNoteQuickDate('240821')).toBe('2024-08-21');
    expect(parseNoteQuickDate('20240821')).toBe('2024-08-21');
    expect(parseNoteQuickDate('24.8.21')).toBe('2024-08-21');
    expect(parseNoteQuickDate('2024년 8월 21일')).toBe('2024-08-21');
  });

  test('month-day shortcuts use the current selected test year', () => {
    expect(parseNoteQuickDate('8/21', { referenceDate: '2024-01-15' })).toBe('2024-08-21');
    expect(parseNoteQuickDate('0821', { referenceDate: '2025-01-15' })).toBe('2025-08-21');
  });

  test('invalid dates are rejected instead of rolling over', () => {
    expect(parseNoteQuickDate('240230')).toBe('');
    expect(parseNoteQuickDate('241331')).toBe('');
    expect(parseNoteQuickDate('240431')).toBe('');
    expect(parseNoteQuickDate('241200')).toBe('');
    expect(parseNoteQuickDate('2024-13-01')).toBe('');
    expect(parseNoteQuickDate('memo')).toBe('');
  });
});
