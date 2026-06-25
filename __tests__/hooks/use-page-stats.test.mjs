import { describe, expect, test } from '@jest/globals';
import { countReportingNotes } from '../../hooks/usePageStats.js';

describe('countReportingNotes', () => {
  test('출시예정 상태 노트와 레거시 보고예정을 집계한다', () => {
    expect(
      countReportingNotes([{ status: '출시예정' }, { status: '완료' }, { status: '보고예정' }])
    ).toBe(2);
  });

  test('깨진 항목이나 배열이 아닌 값은 안전하게 무시한다', () => {
    expect(countReportingNotes([null, undefined, 'bad', { status: '출시예정' }])).toBe(1);
    expect(countReportingNotes(null)).toBe(0);
  });
});
