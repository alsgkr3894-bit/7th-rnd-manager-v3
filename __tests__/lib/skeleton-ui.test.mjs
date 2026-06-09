import { describe, expect, test } from '@jest/globals';
import {
  getSkeletonStyle,
  getSkeletonTableCellWidth,
  normalizeSkeletonColumnCount,
  normalizeSkeletonLength,
  normalizeSkeletonRowCount,
  normalizeSkeletonStyle,
} from '../../lib/ui/skeleton.js';

describe('skeleton ui helpers', () => {
  test('길이 값은 숫자와 문자열만 허용하고 나머지는 fallback을 쓴다', () => {
    expect(normalizeSkeletonLength(120, '100%')).toBe(120);
    expect(normalizeSkeletonLength('60%', '100%')).toBe('60%');
    expect(normalizeSkeletonLength({ width: 120 }, '100%')).toBe('100%');
  });

  test('style은 일반 객체만 병합 대상으로 허용한다', () => {
    const style = { marginBottom: 8 };
    expect(normalizeSkeletonStyle(style)).toBe(style);
    expect(normalizeSkeletonStyle(['bad'])).toBeUndefined();
    expect(normalizeSkeletonStyle(null)).toBeUndefined();
  });

  test('테이블 행/열 개수는 안전한 범위로 보정한다', () => {
    expect(normalizeSkeletonRowCount(3)).toBe(3);
    expect(normalizeSkeletonRowCount(-1)).toBe(0);
    expect(normalizeSkeletonRowCount(100)).toBe(50);
    expect(normalizeSkeletonRowCount('bad')).toBe(5);
    expect(normalizeSkeletonColumnCount(3)).toBe(3);
    expect(normalizeSkeletonColumnCount(0)).toBe(1);
    expect(normalizeSkeletonColumnCount(100)).toBe(20);
    expect(normalizeSkeletonColumnCount('bad')).toBe(5);
  });

  test('기본 skeleton style은 기존 shimmer 값을 유지하고 style prop으로 덮어쓸 수 있다', () => {
    expect(getSkeletonStyle()).toMatchObject({
      width: '100%',
      height: 16,
      borderRadius: 6,
      background: 'var(--surface-2)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    });
    expect(getSkeletonStyle({ width: 120, height: 20, radius: 8, style: { marginTop: 4 } })).toMatchObject({
      width: 120,
      height: 20,
      borderRadius: 8,
      marginTop: 4,
    });
  });

  test('테이블 skeleton 셀 너비는 첫/마지막/중간 열 규칙을 유지한다', () => {
    expect(getSkeletonTableCellWidth(0, 4)).toBe('60%');
    expect(getSkeletonTableCellWidth(1, 4)).toBe('85%');
    expect(getSkeletonTableCellWidth(3, 4)).toBe(40);
    expect(getSkeletonTableCellWidth('bad', 'bad')).toBe('60%');
  });
});
