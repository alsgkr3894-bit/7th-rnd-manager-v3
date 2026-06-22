import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { ensureSession, fetchClientIP, getCachedIP, getLastLogin } from '../../lib/session.js';

const LAST_LOGIN_KEY = 'v3:last-login';
const LAST_IP_KEY = 'v3:last-ip';
const SESSION_FLAG = 'v3:session-active';

let localData;
let sessionData;
const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
const originalLocalStorage = globalThis.localStorage;
const originalSessionStorage = globalThis.sessionStorage;

function makeStorage(data) {
  return {
    getItem: key => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
    removeItem: key => {
      delete data[key];
    },
  };
}

function throwingStorage() {
  return {
    getItem: () => {
      throw new Error('storage unavailable');
    },
    setItem: () => {
      throw new Error('storage unavailable');
    },
    removeItem: () => {
      throw new Error('storage unavailable');
    },
  };
}

beforeEach(() => {
  localData = {};
  sessionData = {};
  globalThis.window = {};
  globalThis.localStorage = makeStorage(localData);
  globalThis.sessionStorage = makeStorage(sessionData);
  globalThis.fetch = undefined;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.window = originalWindow;
  globalThis.localStorage = originalLocalStorage;
  globalThis.sessionStorage = originalSessionStorage;
});

describe('session storage guards', () => {
  test('새 세션이면 이전 로그인 시각을 반환하고 현재 세션을 기록한다', () => {
    localData[LAST_LOGIN_KEY] = '2026-06-01T00:00:00.000Z';

    const result = ensureSession();

    expect(result).toEqual({
      isNewSession: true,
      lastLoginAt: '2026-06-01T00:00:00.000Z',
    });
    expect(sessionData[SESSION_FLAG]).toBe('1');
    expect(localData[LAST_LOGIN_KEY]).not.toBe('2026-06-01T00:00:00.000Z');
  });

  test('브라우저 저장소 접근이 실패해도 앱 초기화 예외를 내지 않는다', () => {
    globalThis.localStorage = throwingStorage();
    globalThis.sessionStorage = throwingStorage();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    let result;
    expect(() => {
      result = ensureSession();
    }).not.toThrow();
    expect(result).toEqual({ isNewSession: true, lastLoginAt: null });
    expect(getLastLogin()).toBeNull();
    warnSpy.mockRestore();
  });

  test('캐시 IP 값이 깨졌거나 객체가 아니면 null로 취급한다', () => {
    localData[LAST_IP_KEY] = 'not-json';
    expect(getCachedIP()).toBeNull();

    localData[LAST_IP_KEY] = JSON.stringify('127.0.0.1');
    expect(getCachedIP()).toBeNull();

    localData[LAST_IP_KEY] = JSON.stringify({ ip: '   ', at: '2026-06-01T00:00:00.000Z' });
    expect(getCachedIP()).toBeNull();

    localData[LAST_IP_KEY] = JSON.stringify({ ip: ' 127.0.0.1 ', at: '2026-06-01T00:00:00.000Z' });
    expect(getCachedIP()).toEqual({ ip: '127.0.0.1', at: '2026-06-01T00:00:00.000Z' });

    localData[LAST_IP_KEY] = JSON.stringify({ ip: '127.0.0.1', at: { bad: true } });
    expect(getCachedIP()).toEqual({ ip: '127.0.0.1', at: '' });
  });

  test('공인 IP 조회 성공 시 공백을 정리해 캐시에 저장한다', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ip: ' 127.0.0.1 ' }),
    });

    const result = await fetchClientIP();

    expect(result.ip).toBe('127.0.0.1');
    expect(getCachedIP().ip).toBe('127.0.0.1');
  });

  test('공인 IP 응답이 비었거나 네트워크 실패면 캐시를 남기지 않고 null을 반환한다', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    globalThis.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ip: '   ' }),
    });

    await expect(fetchClientIP()).resolves.toBeNull();
    expect(getCachedIP()).toBeNull();

    globalThis.fetch = jest.fn().mockRejectedValueOnce('network down');
    await expect(fetchClientIP()).resolves.toBeNull();
    expect(getCachedIP()).toBeNull();
    warnSpy.mockRestore();
  });
});
