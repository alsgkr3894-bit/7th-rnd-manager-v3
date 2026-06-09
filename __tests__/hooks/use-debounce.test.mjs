import { describe, expect, test } from '@jest/globals';
import { normalizeDelay } from '../../hooks/useDebounce.js';

describe('normalizeDelay', () => {
  test('유효한 0 이상의 숫자만 지연값으로 사용한다', () => {
    expect(normalizeDelay(0)).toBe(0);
    expect(normalizeDelay('250')).toBe(250);
  });

  test('음수와 비정상 값은 fallback으로 복구한다', () => {
    expect(normalizeDelay(-1, 200)).toBe(200);
    expect(normalizeDelay('bad', 200)).toBe(200);
    expect(normalizeDelay(Infinity, 200)).toBe(200);
  });
});
