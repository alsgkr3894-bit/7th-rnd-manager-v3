import { describe, expect, test } from '@jest/globals';
import { normalizeScrollTop } from '../../hooks/useScrollMemory.js';

describe('normalizeScrollTop', () => {
  test('유효한 스크롤 숫자는 정수로 복구한다', () => {
    expect(normalizeScrollTop('120')).toBe(120);
    expect(normalizeScrollTop(' 120.8 ')).toBe(120);
    expect(normalizeScrollTop(45.9)).toBe(45);
  });

  test('빈 값과 숫자가 아닌 값은 복원하지 않는다', () => {
    expect(normalizeScrollTop(null)).toBeNull();
    expect(normalizeScrollTop('')).toBeNull();
    expect(normalizeScrollTop('120px')).toBeNull();
    expect(normalizeScrollTop('bad')).toBeNull();
  });

  test('음수와 무한대는 복원하지 않는다', () => {
    expect(normalizeScrollTop(-1)).toBeNull();
    expect(normalizeScrollTop(Infinity)).toBeNull();
  });
});
