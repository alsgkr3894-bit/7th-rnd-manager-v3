import { describe, expect, test } from '@jest/globals';
import { normalizeCloseHandler, normalizeCloseMs } from '../../hooks/useModalShell.js';

describe('normalizeCloseMs', () => {
  test('유효한 0 이상의 숫자만 닫힘 지연값으로 사용한다', () => {
    expect(normalizeCloseMs(0)).toBe(0);
    expect(normalizeCloseMs('180')).toBe(180);
  });

  test('음수와 비정상 값은 fallback으로 복구한다', () => {
    expect(normalizeCloseMs(-10, 180)).toBe(180);
    expect(normalizeCloseMs('bad', 180)).toBe(180);
    expect(normalizeCloseMs(NaN, 180)).toBe(180);
  });
});

describe('normalizeCloseHandler', () => {
  test('함수 콜백은 그대로 보존한다', () => {
    const fn = () => 'ok';
    expect(normalizeCloseHandler(fn)).toBe(fn);
  });

  test('비함수 콜백은 안전한 noop으로 대체한다', () => {
    expect(() => normalizeCloseHandler(null)()).not.toThrow();
    expect(() => normalizeCloseHandler('bad')()).not.toThrow();
  });
});
