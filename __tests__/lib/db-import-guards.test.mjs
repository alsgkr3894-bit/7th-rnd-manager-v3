import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { importAll } from '../../lib/db/operations.js';

const originalLocalStorage = globalThis.localStorage;

afterEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: originalLocalStorage,
  });
});

describe('importAll 구조 방어', () => {
  test('store 값이 배열이 아니면 복원을 건너뛰고 오류로 보고한다', async () => {
    const result = await importAll({ stores: { settings: {} } });

    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errors).toEqual([
      { store: 'settings', error: 'store 데이터가 배열이 아닙니다.' },
    ]);
  });

  test('store 배열에 객체가 아닌 레코드가 있으면 해당 store 복원을 건너뛴다', async () => {
    const result = await importAll({ stores: { settings: [{ id: 'ok' }, null, 'bad'] } });

    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errors).toEqual([
      { store: 'settings', error: 'store 레코드가 객체가 아닙니다. index: 1, 2' },
    ]);
  });

  test('현재 schema에서 제거된 legacy store는 복원 시 건너뛴다', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const result = await importAll({
        stores: {
          cost_recipes: [{ id: 1 }],
          cost_pizza_detail: [{ id: 2 }],
        },
      });

      expect(result).toEqual({ imported: 0, skipped: 2, errors: [] });
    } finally {
      warnSpy.mockRestore();
    }
  });

  test('localStorage 복원 실패는 결과 errors에 보고한다', async () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        setItem() {
          throw new Error('quota');
        },
      },
    });

    const result = await importAll({
      stores: {},
      localStorage: {
        'v3:profile': 'profile',
      },
    });

    expect(result).toEqual({
      imported: 0,
      skipped: 0,
      errors: [
        {
          store: 'localStorage',
          error: 'localStorage 복원 실패 1건: v3:profile',
        },
      ],
    });
  });
});
