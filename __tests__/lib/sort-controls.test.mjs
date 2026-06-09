import { describe, expect, test } from '@jest/globals';
import {
  getSortButtonClassName,
  getSortIndicator,
  normalizeSortChangeHandler,
  normalizeSortDirection,
  normalizeSortOptions,
  normalizeSortValue,
  normalizeSortableStyle,
  normalizeSortableWidth,
  normalizeTableSpan,
  SORT_DIRECTION_ASC,
  SORT_DIRECTION_DESC,
} from '../../lib/ui/sort-controls.js';

describe('sort control helpers', () => {
  test('정렬 값은 표시 가능한 문자열로 보정한다', () => {
    expect(normalizeSortValue('name')).toBe('name');
    expect(normalizeSortValue(2026)).toBe('2026');
    expect(normalizeSortValue({ key: 'bad' })).toBe('');
  });

  test('정렬 방향은 asc 외에는 기존 하향 표시로 보정한다', () => {
    expect(normalizeSortDirection(SORT_DIRECTION_ASC)).toBe(SORT_DIRECTION_ASC);
    expect(normalizeSortDirection('bad')).toBe(SORT_DIRECTION_DESC);
  });

  test('정렬 옵션은 잘못된 배열 항목을 제외하고 key와 label을 만든다', () => {
    expect(
      normalizeSortOptions([{ id: 'name', label: '이름순' }, null, { id: '', label: '' }])
    ).toEqual([
      { id: 'name', key: 'name', label: '이름순' },
      { id: '', key: 'option-1', label: '' },
    ]);
  });

  test('버튼 className은 활성 상태만 active를 붙인다', () => {
    expect(getSortButtonClassName('name', 'name')).toBe('chip active');
    expect(getSortButtonClassName('name', 'category')).toBe('chip');
  });

  test('정렬 표시 아이콘은 활성 키와 방향에 맞춰 반환한다', () => {
    expect(getSortIndicator('name', 'category', SORT_DIRECTION_ASC)).toEqual({
      active: false,
      symbol: '▾',
    });
    expect(getSortIndicator('name', 'name', SORT_DIRECTION_ASC)).toEqual({
      active: true,
      symbol: '▲',
    });
    expect(getSortIndicator('name', 'name', 'bad')).toEqual({ active: true, symbol: '▼' });
  });

  test('테이블 width, style, span prop을 안전하게 보정한다', () => {
    const style = { textAlign: 'right' };
    expect(normalizeSortableWidth(120)).toBe(120);
    expect(normalizeSortableWidth({ width: 120 })).toBeUndefined();
    expect(normalizeSortableStyle(style)).toBe(style);
    expect(normalizeSortableStyle(['bad'])).toBeUndefined();
    expect(normalizeTableSpan('2')).toBe(2);
    expect(normalizeTableSpan(0)).toBe(1);
    expect(normalizeTableSpan('bad')).toBeUndefined();
    expect(normalizeTableSpan(null)).toBeUndefined();
  });

  test('onChange는 함수만 그대로 사용한다', () => {
    const handler = () => 'ok';
    expect(normalizeSortChangeHandler(handler)).toBe(handler);
    expect(() => normalizeSortChangeHandler(null)('name')).not.toThrow();
  });
});
