import { describe, expect, test } from '@jest/globals';
import { normalizeCountUpNumber, normalizeCountUpOptions } from '../../hooks/useCountUp.js';

describe('normalizeCountUpNumber', () => {
  test('유효한 숫자 문자열은 숫자로 변환한다', () => {
    expect(normalizeCountUpNumber('12.5')).toBe(12.5);
  });

  test('NaN/Infinity는 fallback으로 복구한다', () => {
    expect(normalizeCountUpNumber('bad', 7)).toBe(7);
    expect(normalizeCountUpNumber(Infinity, 7)).toBe(7);
  });
});

describe('normalizeCountUpOptions', () => {
  test('duration은 최소 1ms로 보정한다', () => {
    expect(normalizeCountUpOptions({ duration: 0 }).duration).toBe(1);
  });

  test('옵션 객체가 아니면 기본 옵션으로 복구한다', () => {
    expect(normalizeCountUpOptions(null)).toEqual({
      duration: 1200,
      delay: 0,
      decimals: 0,
    });
    expect(normalizeCountUpOptions('bad')).toEqual({
      duration: 1200,
      delay: 0,
      decimals: 0,
    });
  });

  test('delay와 decimals는 음수/비정상 값을 0 이상으로 보정한다', () => {
    expect(normalizeCountUpOptions({ delay: -10, decimals: -2 })).toMatchObject({
      delay: 0,
      decimals: 0,
    });
  });

  test('decimals는 정수로 내린다', () => {
    expect(normalizeCountUpOptions({ decimals: 2.8 }).decimals).toBe(2);
  });
});
