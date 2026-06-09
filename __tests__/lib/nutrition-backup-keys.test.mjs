import { afterEach, describe, expect, test } from '@jest/globals';
import {
  collectLocalStorage,
  restoreLocalStorage,
} from '../../lib/nutrition/backup-keys.js';

const originalLocalStorage = globalThis.localStorage;

afterEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: originalLocalStorage,
  });
});

function installStorage(storage) {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
}

describe('nutrition backup localStorage keys', () => {
  test('collectLocalStorage는 읽기 실패 키만 건너뛴다', () => {
    installStorage({
      getItem(key) {
        if (key === 'bad') throw new Error('blocked');
        return key === 'good' ? 'saved' : null;
      },
    });

    expect(collectLocalStorage(['good', 'bad', 'empty'])).toEqual({ good: 'saved' });
  });

  test('restoreLocalStorage는 쓰기 실패와 알 수 없는 키를 건너뛰고 성공 개수를 반환한다', () => {
    const saved = {};
    installStorage({
      setItem(key, value) {
        if (key === 'bad') throw new Error('quota');
        saved[key] = value;
      },
    });

    expect(restoreLocalStorage(
      { good: '1', bad: '2', unknown: '3', nonString: 4 },
      ['good', 'bad', 'nonString'],
    )).toBe(1);
    expect(saved).toEqual({ good: '1' });
  });
});
