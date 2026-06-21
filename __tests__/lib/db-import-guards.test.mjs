import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { importAll } from '../../lib/db/operations.js';
import { replaceStoresInDbTransaction } from '../../lib/db/backup.js';

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

  test('사전 검증 오류가 있으면 정상 store도 교체하지 않는다', async () => {
    const result = await importAll({
      stores: {
        sales_files: [{ id: 1 }],
        settings: {},
      },
    });

    expect(result).toEqual({
      imported: 0,
      skipped: 0,
      errors: [{ store: 'settings', error: 'store 데이터가 배열이 아닙니다.' }],
    });
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

  test('같은 DB의 여러 store는 하나의 교체 트랜잭션으로 묶는다', async () => {
    const state = {
      sales_files: [{ id: 1, year: 2026, month: 5 }],
      sales_rows: [{ id: 10, fileId: 1 }],
    };
    const db = makeFakeDb(state);

    const result = await replaceStoresInDbTransaction(db, [
      ['sales_files', [{ id: 2, year: 2026, month: 6 }]],
      ['sales_rows', [{ id: 20, fileId: 2 }]],
    ]);

    expect(result).toEqual({ sales_files: 1, sales_rows: 1 });
    expect(db.transactions).toEqual([[['sales_files', 'sales_rows'], 'readwrite']]);
    expect(state).toEqual({
      sales_files: [{ id: 2, year: 2026, month: 6 }],
      sales_rows: [{ id: 20, fileId: 2 }],
    });
  });

  test('store 그룹 교체 중 실패하면 같은 DB의 기존 데이터는 유지된다', async () => {
    const state = {
      sales_files: [{ id: 1, year: 2026, month: 5 }],
      sales_rows: [{ id: 10, fileId: 1 }],
    };
    const db = makeFakeDb(state, { failOnStore: 'sales_rows' });

    await expect(
      replaceStoresInDbTransaction(db, [
        ['sales_files', [{ id: 2, year: 2026, month: 6 }]],
        ['sales_rows', [{ id: 20, fileId: 2 }]],
      ])
    ).rejects.toThrow('put failed: sales_rows');

    expect(state).toEqual({
      sales_files: [{ id: 1, year: 2026, month: 5 }],
      sales_rows: [{ id: 10, fileId: 1 }],
    });
  });
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeFakeDb(state, options = {}) {
  const transactions = [];
  return {
    transactions,
    transaction(storeNames, mode) {
      const stores = Array.isArray(storeNames) ? storeNames : [storeNames];
      transactions.push([stores, mode]);
      const draft = clone(state);
      const tx = {
        error: null,
        oncomplete: null,
        onerror: null,
        onabort: null,
        abort() {
          tx.error = tx.error || new Error('transaction aborted');
        },
        objectStore(storeName) {
          // 실제 IDB의 clear()/put()은 IDBRequest를 반환한다(onerror 설정 가능).
          return {
            clear() {
              draft[storeName] = [];
              return { onerror: null };
            },
            put(record) {
              if (options.failOnStore === storeName) {
                throw new Error(`put failed: ${storeName}`);
              }
              draft[storeName].push(clone(record));
              return { onerror: null };
            },
          };
        },
      };
      setTimeout(() => {
        if (tx.error) {
          tx.onabort?.();
          return;
        }
        for (const storeName of stores) {
          state[storeName] = draft[storeName];
        }
        tx.oncomplete?.();
      }, 0);
      return tx;
    },
  };
}
