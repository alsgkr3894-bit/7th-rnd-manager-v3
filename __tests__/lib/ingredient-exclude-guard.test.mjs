import { beforeEach, describe, expect, jest, test } from '@jest/globals';

/**
 * excludeIngredientByCode가 productCode 없이 호출되면(제품코드 없는 행이 실수로
 * 이 경로를 타는 경우) productCode: undefined인 유령 레코드를 새로 만들던 버그를 막는다.
 */
let stores = {};

function rows(name) {
  return (stores[name] ??= []);
}

function makeObjectStore(name) {
  return {
    put(record) {
      const idx = rows(name).findIndex(r => r.id === record.id);
      if (idx >= 0) rows(name)[idx] = record;
      else rows(name).push(record);
    },
  };
}

const runTransaction = jest.fn((storeNames, mode, work) => {
  const allowed = Array.isArray(storeNames) ? storeNames : [storeNames];
  const tx = {
    objectStore(name) {
      if (!allowed.includes(name)) throw new Error(`unexpected store: ${name}`);
      return makeObjectStore(name);
    },
  };
  work(tx);
  return Promise.resolve();
});
const assertActiveAdmin = jest.fn();

jest.unstable_mockModule('@/lib/db', () => ({
  hasStore: jest.fn(name => name in stores),
  getAll: jest.fn(name => Promise.resolve([...rows(name)])),
  runTransaction,
}));

jest.unstable_mockModule('@/lib/auth/guard', () => ({ assertActiveAdmin }));

const { excludeIngredientByCode } = await import('../../lib/ingredient/destructive.js');

describe('excludeIngredientByCode — 빈 productCode 가드', () => {
  beforeEach(() => {
    runTransaction.mockClear();
    assertActiveAdmin.mockReset();
    assertActiveAdmin.mockResolvedValue();
    stores = { cost_ingredients: [] };
  });

  test('productCode가 없으면 던지고 레코드를 만들지 않는다', async () => {
    await expect(excludeIngredientByCode(undefined)).rejects.toThrow(
      '제품코드가 없는 항목은 이 방법으로 단종 처리할 수 없습니다.'
    );
    expect(stores.cost_ingredients).toHaveLength(0);
    expect(runTransaction).not.toHaveBeenCalled();
  });

  test('productCode가 있으면 정상 동작한다', async () => {
    stores.cost_ingredients = [{ id: 1, productCode: 'A1', ingredientName: '설탕' }];
    await excludeIngredientByCode('A1');
    expect(stores.cost_ingredients.find(r => r.id === 1).excluded).toBe(true);
  });
});
