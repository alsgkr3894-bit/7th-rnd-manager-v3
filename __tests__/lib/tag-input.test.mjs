import { describe, expect, test } from '@jest/globals';
import {
  DEFAULT_TAG_INPUT_PLACEHOLDER,
  filterTagSuggestions,
  normalizeTagInputPlaceholder,
  normalizeTagInputOnChange,
  normalizeTagSuggestions,
  normalizeTagText,
  parseTagInputValue,
  serializeTagInputValue,
} from '../../lib/ui/tag-input.js';

describe('tag input helpers', () => {
  test('태그 텍스트는 표시 가능한 값만 trim한다', () => {
    expect(normalizeTagText(' 피자 ')).toBe('피자');
    expect(normalizeTagText(2026)).toBe('2026');
    expect(normalizeTagText({ tag: 'bad' })).toBe('');
  });

  test('comma 문자열을 태그 배열로 바꾸며 빈 값과 중복을 제거한다', () => {
    expect(parseTagInputValue(' 피자, ,사이드,피자,도우 ')).toEqual(['피자', '사이드', '도우']);
    expect(parseTagInputValue(['피자', ' 피자 ', 2026])).toEqual(['피자', '2026']);
    expect(parseTagInputValue(null)).toEqual([]);
  });

  test('태그 배열은 기존 저장 포맷인 comma 문자열로 직렬화한다', () => {
    expect(serializeTagInputValue(['피자', '', ' 사이드 ', '피자'])).toBe('피자, 사이드');
    expect(serializeTagInputValue(' 피자, 사이드, 피자 ')).toBe('피자, 사이드');
  });

  test('추천 태그는 선택된 태그와 빈 값, 중복을 제외한다', () => {
    expect(normalizeTagSuggestions(['피자', '피자', '', '사이드', '도우'], ['피자'])).toEqual([
      '사이드',
      '도우',
    ]);
  });

  test('추천 필터링은 입력값과 개수 제한을 안전하게 적용한다', () => {
    expect(filterTagSuggestions(['피자', '피자롤', '사이드'], '피자', [], 1)).toEqual(['피자']);
    expect(filterTagSuggestions(['피자', '피자롤', '피자빵'], '피자', [], 'bad')).toHaveLength(3);
    expect(filterTagSuggestions(['피자'], '', [], 7)).toEqual([]);
  });

  test('placeholder는 표시 가능한 값만 사용하고 기본값으로 보정한다', () => {
    expect(normalizeTagInputPlaceholder('직접 입력')).toBe('직접 입력');
    expect(normalizeTagInputPlaceholder({})).toBe(DEFAULT_TAG_INPUT_PLACEHOLDER);
  });

  test('onChange는 함수만 그대로 사용한다', () => {
    const handler = () => 'ok';
    expect(normalizeTagInputOnChange(handler)).toBe(handler);
    expect(() => normalizeTagInputOnChange(null)('피자')).not.toThrow();
  });
});
