import { afterEach, describe, expect, test } from '@jest/globals';
import { isAuthSetup, savePassword, verifyPassword } from '@/lib/auth';

const originalLocalStorage = globalThis.localStorage;

afterEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: originalLocalStorage,
  });
});

function installStorage({ throwOnGet = false, throwOnSet = false } = {}) {
  const store = {};
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem(key) {
        if (throwOnGet) throw new Error('storage blocked');
        return store[key] ?? null;
      },
      setItem(key, value) {
        if (throwOnSet) throw new Error('storage blocked');
        store[key] = String(value);
      },
    },
  });
  return store;
}

describe('auth localStorage safety', () => {
  test('저장소를 읽을 수 없으면 setup/password check는 안전하게 실패한다', async () => {
    installStorage({ throwOnGet: true });

    expect(isAuthSetup()).toBe(false);
    await expect(verifyPassword('secret')).resolves.toBe(false);
  });

  test('저장소를 쓸 수 없으면 비밀번호 저장 실패를 명확히 알린다', async () => {
    installStorage({ throwOnSet: true });

    await expect(savePassword('secret')).rejects.toThrow('브라우저 저장소');
  });

  test('정상 저장소에서는 저장 후 검증이 통과한다', async () => {
    installStorage();

    await savePassword('secret');

    expect(isAuthSetup()).toBe(true);
    await expect(verifyPassword('secret')).resolves.toBe(true);
    await expect(verifyPassword('wrong')).resolves.toBe(false);
  });
});
