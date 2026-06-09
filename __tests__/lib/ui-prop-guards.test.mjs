import { describe, expect, test } from '@jest/globals';
import {
  asArray,
  asDisplayText,
  asFiniteNumber,
  asObjectArray,
  asStringArray,
  asTimestamp,
  clampInteger,
} from '../../lib/ui/prop-guards.js';

describe('ui prop guards', () => {
  test('asArray는 배열만 그대로 통과시킨다', () => {
    const list = [1, 2];
    expect(asArray(list)).toBe(list);
    expect(asArray(null)).toEqual([]);
    expect(asArray({ length: 1 })).toEqual([]);
  });

  test('asStringArray는 문자열 후보만 보존한다', () => {
    expect(asStringArray(['a', 1, '', null, 'b'])).toEqual(['a', '', 'b']);
  });

  test('asObjectArray는 일반 객체 항목만 보존한다', () => {
    expect(asObjectArray([{ id: 1 }, null, ['bad'], 'bad', { id: 2 }])).toEqual([
      { id: 1 },
      { id: 2 },
    ]);
  });

  test('asDisplayText는 렌더링 가능한 표시값만 문자열로 변환한다', () => {
    expect(asDisplayText('라벨')).toBe('라벨');
    expect(asDisplayText(7)).toBe('7');
    expect(asDisplayText(null, '—')).toBe('—');
    expect(asDisplayText({ label: 'bad' }, '—')).toBe('—');
  });

  test('asFiniteNumber는 빈 값과 비정상 숫자를 fallback으로 복구한다', () => {
    expect(asFiniteNumber('12.5')).toBe(12.5);
    expect(asFiniteNumber(0)).toBe(0);
    expect(asFiniteNumber('')).toBeNull();
    expect(asFiniteNumber('   ', 7)).toBe(7);
    expect(asFiniteNumber('bad', 3)).toBe(3);
  });

  test('asTimestamp는 날짜 후보를 안전한 timestamp로 변환한다', () => {
    expect(asTimestamp('2026-06-01T00:00:00.000Z')).toBe(
      new Date('2026-06-01T00:00:00.000Z').getTime()
    );
    expect(asTimestamp(new Date('2026-03-01T00:00:00.000Z'))).toBe(
      new Date('2026-03-01T00:00:00.000Z').getTime()
    );
    expect(asTimestamp(200)).toBe(200);
    expect(asTimestamp({ value: '2026-06-01' }, 7)).toBe(7);
    expect(asTimestamp('bad-date', 9)).toBe(9);
  });

  test('clampInteger는 비정상 숫자를 fallback으로 복구하고 범위를 제한한다', () => {
    expect(clampInteger('4.8', { min: 1, max: 5, fallback: 2 })).toBe(4);
    expect(clampInteger(99, { min: 1, max: 5, fallback: 2 })).toBe(5);
    expect(clampInteger('bad', { min: 1, max: 5, fallback: 2 })).toBe(2);
  });
});
