import { describe, expect, test } from '@jest/globals';
import {
  filterComboBoxOptions,
  normalizeComboBoxClassName,
  normalizeComboBoxMaxItems,
  normalizeComboBoxOnChange,
  normalizeComboBoxOptions,
  normalizeComboBoxStyle,
  normalizeComboBoxValue,
} from '../../lib/ui/combo-box.js';

describe('combo box helpers', () => {
  test('value와 className은 표시 가능한 값만 문자열로 정규화한다', () => {
    expect(normalizeComboBoxValue('피자')).toBe('피자');
    expect(normalizeComboBoxValue(7)).toBe('7');
    expect(normalizeComboBoxValue({ label: 'bad' })).toBe('');
    expect(normalizeComboBoxClassName('input')).toBe('input');
    expect(normalizeComboBoxClassName(null)).toBeUndefined();
  });

  test('style은 일반 객체만 통과시킨다', () => {
    const style = { width: 120 };
    expect(normalizeComboBoxStyle(style)).toBe(style);
    expect(normalizeComboBoxStyle(null)).toBeUndefined();
    expect(normalizeComboBoxStyle(['bad'])).toBeUndefined();
  });

  test('onChange는 함수만 그대로 사용한다', () => {
    const handler = () => 'ok';
    expect(normalizeComboBoxOnChange(handler)).toBe(handler);
    expect(() => normalizeComboBoxOnChange(null)('피자')).not.toThrow();
  });

  test('옵션은 문자열만 보존하고 빈 값과 중복을 제거한다', () => {
    expect(normalizeComboBoxOptions([' 피자 ', '피자', '', 10, '사이드', null])).toEqual(['피자', '사이드']);
  });

  test('필터링은 검색어와 최대 개수를 안전하게 적용한다', () => {
    expect(filterComboBoxOptions(['피자', '사이드', '피자롤'], '피자', 10)).toEqual(['피자', '피자롤']);
    expect(filterComboBoxOptions(['a', 'b', 'c'], '', 2)).toEqual(['a', 'b']);
    expect(normalizeComboBoxMaxItems('bad')).toBe(30);
  });
});
