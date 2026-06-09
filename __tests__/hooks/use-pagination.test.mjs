import { describe, expect, test } from '@jest/globals';
import { normalizePageTarget } from '../../hooks/usePagination.js';

describe('normalizePageTarget', () => {
  test('유효하지 않은 페이지 입력은 1페이지로 복구한다', () => {
    expect(normalizePageTarget(NaN, 5)).toBe(1);
    expect(normalizePageTarget('bad', 5)).toBe(1);
  });

  test('페이지 범위를 1과 totalPages 사이로 제한한다', () => {
    expect(normalizePageTarget(-10, 5)).toBe(1);
    expect(normalizePageTarget(10, 5)).toBe(5);
  });

  test('소수 입력은 정수 페이지로 내린다', () => {
    expect(normalizePageTarget(2.8, 5)).toBe(2);
  });

  test('totalPages가 잘못되면 1페이지로 제한한다', () => {
    expect(normalizePageTarget(3, 0)).toBe(1);
    expect(normalizePageTarget(3, NaN)).toBe(1);
  });
});
