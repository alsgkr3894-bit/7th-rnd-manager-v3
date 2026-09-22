import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
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

describe('useLocalStorage 저장 규칙 (소스 기준)', () => {
  // 2026-09-22: "첫 저장 1회 스킵" ref 방식은 StrictMode의 effect 2회 실행에서 복원 전
  // initialValue를 저장소에 써 버려, 같은 키를 같은 커밋에 마운트한 다른 훅이 낡은 값을
  // 복원했다(홈 인사말 경보 수 ≠ 위젯 경보 수). 복원 완료 후 값이 바뀐 경우에만 저장한다.
  test('복원 전에는 저장하지 않고, 복원한 값과 같은 값은 다시 쓰지 않는다', () => {
    const src = readFileSync('hooks/useLocalStorage.js', 'utf8');
    expect(src).not.toContain('isFirstSave');
    expect(src).toContain('syncedRef.current = restored');
    expect(src).toContain('if (!hydrated || Object.is(value, syncedRef.current)) return;');
    expect(src).toContain('}, [key, value, hydrated]);');
  });
});
