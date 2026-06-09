import { afterEach, describe, expect, test } from '@jest/globals';
import { getInitial, getProfile, setProfile } from '../../lib/profile.js';
import { KEYS } from '../../lib/note/keys.js';

const originalLocalStorage = globalThis.localStorage;

afterEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: originalLocalStorage,
  });
});

function installStorage(initial = {}) {
  const store = { ...initial };
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: key => store[key] ?? null,
      setItem: (key, value) => {
        store[key] = value;
      },
    },
  });
  return store;
}

describe('profile storage guards', () => {
  test('getProfile은 객체가 아닌 저장값을 기본값으로 복구한다', () => {
    installStorage({ [KEYS.PROFILE]: JSON.stringify(['bad']) });

    expect(getProfile()).toMatchObject({
      name: '이민학 주임',
      email: 'rnd@7thpizza.com',
    });
  });

  test('setProfile은 문자열 필드만 저장한다', () => {
    const store = installStorage();

    const profile = setProfile({ name: '테스터', email: 123, team: 'QA' });

    expect(profile).toMatchObject({
      name: '테스터',
      email: 'rnd@7thpizza.com',
      team: 'QA',
    });
    expect(JSON.parse(store[KEYS.PROFILE])).toEqual(profile);
  });

  test('getInitial은 공백 이름을 ?로 표시한다', () => {
    expect(getInitial('  ')).toBe('?');
    expect(getInitial(' 테스터 ')).toBe('테');
    expect(getInitial({ name: 'bad' })).toBe('?');
    expect(getInitial(7)).toBe('7');
  });
});
