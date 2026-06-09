import { describe, expect, test } from '@jest/globals';
import {
  DEFAULT_SEARCH_PLACEHOLDER,
  getSearchBoxRightPadding,
  normalizeSearchBoxOnChange,
  normalizeSearchBoxPlaceholder,
  normalizeSearchBoxValue,
} from '../../lib/ui/search-box.js';

describe('search box helpers', () => {
  test('검색 값은 표시 가능한 값만 문자열로 정규화한다', () => {
    expect(normalizeSearchBoxValue('피자')).toBe('피자');
    expect(normalizeSearchBoxValue(2026)).toBe('2026');
    expect(normalizeSearchBoxValue(null)).toBe('');
    expect(normalizeSearchBoxValue({ q: 'bad' })).toBe('');
  });

  test('placeholder는 표시 불가능한 값이면 기본 문구로 복구한다', () => {
    expect(normalizeSearchBoxPlaceholder('메뉴 검색')).toBe('메뉴 검색');
    expect(normalizeSearchBoxPlaceholder(null)).toBe(DEFAULT_SEARCH_PLACEHOLDER);
    expect(normalizeSearchBoxPlaceholder({ label: 'bad' })).toBe(DEFAULT_SEARCH_PLACEHOLDER);
  });

  test('onChange는 함수만 그대로 사용하고 나머지는 noop으로 대체한다', () => {
    const handler = () => 'ok';
    expect(normalizeSearchBoxOnChange(handler)).toBe(handler);
    expect(() => normalizeSearchBoxOnChange(null)('피자')).not.toThrow();
  });

  test('검색어가 있을 때만 지우기 버튼 공간을 확보한다', () => {
    expect(getSearchBoxRightPadding('피자')).toBe(32);
    expect(getSearchBoxRightPadding('')).toBe(12);
    expect(getSearchBoxRightPadding(null)).toBe(12);
  });
});
