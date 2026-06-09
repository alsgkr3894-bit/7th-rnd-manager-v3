import { describe, expect, test } from '@jest/globals';
import { normalizeLocalStorageValue } from '../../hooks/useLocalStorage.js';

describe('normalizeLocalStorageValue', () => {
  test('정규화 함수가 없으면 기존 값을 그대로 반환한다', () => {
    expect(normalizeLocalStorageValue('plain', 'fallback')).toBe('plain');
  });

  test('정규화 함수 결과를 반환한다', () => {
    const normalizePercent = value => {
      const n = Number(value);
      return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 30;
    };

    expect(normalizeLocalStorageValue('120', 30, normalizePercent)).toBe(100);
    expect(normalizeLocalStorageValue('bad', 30, normalizePercent)).toBe(30);
  });

  test('정규화 함수가 실패하면 fallback을 반환한다', () => {
    expect(
      normalizeLocalStorageValue('bad', 'fallback', () => {
        throw new Error('bad');
      })
    ).toBe('fallback');
  });
});
