import { describe, expect, test } from '@jest/globals';
import { normalizeSearchHistory } from '../../hooks/useSearchHistory.js';

describe('normalizeSearchHistory', () => {
  test('배열이 아니면 빈 검색 기록으로 처리한다', () => {
    expect(normalizeSearchHistory(null)).toEqual([]);
    expect(normalizeSearchHistory({ q: '피자' })).toEqual([]);
  });

  test('문자열이 아닌 값과 빈 문자열을 제외하고 공백을 정리한다', () => {
    expect(normalizeSearchHistory([' 피자 ', '', 10, '원가', null])).toEqual(['피자', '원가']);
  });

  test('저장소에 중복된 검색어가 있으면 처음 나온 순서만 보존한다', () => {
    expect(normalizeSearchHistory(['피자', '원가', ' 피자 ', '샘플', '원가'])).toEqual([
      '피자',
      '원가',
      '샘플',
    ]);
  });

  test('검색 기록은 최대 5개까지만 유지한다', () => {
    expect(normalizeSearchHistory(['a', 'b', 'c', 'd', 'e', 'f'])).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
    ]);
  });
});
