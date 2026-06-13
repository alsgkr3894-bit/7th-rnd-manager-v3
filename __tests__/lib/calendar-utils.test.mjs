import { describe, expect, test } from '@jest/globals';
import {
  checklistJournalContent,
  checklistJournalTitle,
  daysInMonth,
  firstDow,
  groupByDate,
  normalizeChecklistMap,
  toKey,
} from '../../app/note/calendar/_calendar-utils.js';

describe('calendar utils', () => {
  test('날짜 key와 월 정보 계산을 유지한다', () => {
    expect(toKey(2026, 6, 3)).toBe('2026-06-03');
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(firstDow(2026, 6)).toBe(1);
  });

  test('날짜별 그룹핑은 빈 key를 무시한다', () => {
    const rows = [
      { date: '2026-06-01', title: 'a' },
      { date: '', title: 'b' },
    ];
    const grouped = groupByDate(rows, row => row.date);
    expect(grouped.get('2026-06-01')).toEqual([rows[0]]);
    expect(grouped.has('')).toBe(false);
  });

  test('체크리스트 저장값은 표시 가능한 항목만 보존한다', () => {
    expect(
      normalizeChecklistMap({
        '2026-06-12': [
          { id: 1, text: '테스트', done: true },
          { id: 2, text: '   ', done: true },
        ],
        broken: null,
      })
    ).toEqual({
      '2026-06-12': [{ id: '1', text: '테스트', done: true }],
    });
  });

  test('체크리스트 연구일지 텍스트를 생성한다', () => {
    expect(checklistJournalTitle('2026-06-12')).toBe('2026-06-12 체크리스트 완료');
    expect(checklistJournalContent([{ text: '샘플 확인' }])).toContain('- 샘플 확인');
    expect(checklistJournalContent([])).toBe('완료 항목 없음');
  });
});
