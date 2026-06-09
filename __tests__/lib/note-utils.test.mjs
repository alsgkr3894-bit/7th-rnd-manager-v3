import {
  buildHighlightRegex,
  formatFullDate,
  formatShortDate,
  parseTagList,
} from '../../lib/note/utils.js';

describe('note utils guards', () => {
  test('parseTagList는 비문자 입력도 안전하게 처리', () => {
    expect(parseTagList(null)).toEqual([]);
    expect(parseTagList({})).toEqual([]);
    expect(parseTagList(' a, ,b ')).toEqual(['a', 'b']);
  });

  test('날짜 포맷터는 입력을 표시 문자열로 정규화', () => {
    expect(formatFullDate('2026-06-09')).toBe('2026.06.09');
    expect(formatFullDate(20260609)).toBe('20260609');
    expect(formatFullDate({ value: '2026-06-09' })).toBe('');
    expect(formatShortDate('2026-06-09')).toBe('06.09');
    expect(formatShortDate({ value: '2026-06-09' })).toBe('');
  });

  test('buildHighlightRegex는 특수문자를 escape한다', () => {
    const regex = buildHighlightRegex('a+b');
    expect('a+b'.split(regex)).toEqual(['', 'a+b', '']);
    expect(buildHighlightRegex({ value: 'bad' })).toBeNull();
  });
});
