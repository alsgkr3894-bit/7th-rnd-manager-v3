import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import {
  clearLoginFailures,
  getLoginThrottle,
  LOGIN_LOCK_MS,
  MAX_LOGIN_FAILURES,
  recordLoginFailure,
} from '@/lib/auth';

const originalLocalStorage = globalThis.localStorage;

beforeEach(() => {
  const values = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: key => values.delete(key),
    },
  });
});

afterEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: originalLocalStorage,
  });
});

describe('로그인 실패 횟수 제한', () => {
  test('5회 실패하면 15분 동안 잠긴다', () => {
    const now = 1_000_000;
    let result;
    for (let index = 0; index < MAX_LOGIN_FAILURES; index++) result = recordLoginFailure(now);

    expect(result).toMatchObject({ locked: true, failures: 5, remainingMs: LOGIN_LOCK_MS });
    expect(getLoginThrottle(now + 1)).toMatchObject({ locked: true });
  });

  test('잠금 시간이 지나면 실패 횟수가 초기화된다', () => {
    const now = 1_000_000;
    for (let index = 0; index < MAX_LOGIN_FAILURES; index++) recordLoginFailure(now);

    expect(getLoginThrottle(now + LOGIN_LOCK_MS)).toEqual({
      locked: false,
      remainingMs: 0,
      failures: 0,
    });
  });

  test('로그인 성공 처리 시 실패 기록을 지운다', () => {
    recordLoginFailure(1_000_000);
    clearLoginFailures();
    expect(getLoginThrottle(1_000_001)).toMatchObject({ locked: false, failures: 0 });
  });
});
