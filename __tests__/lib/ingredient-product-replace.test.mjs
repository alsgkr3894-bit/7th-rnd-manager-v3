import { beforeEach, describe, expect, jest, test } from '@jest/globals';

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
    delete(id) {
      stores[name] = rows(name).filter(r => r.id !== id);
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

const { replaceIngredientProductCode } = await import('../../lib/ingredient/product-replace.js');

describe('replaceIngredientProductCode', () => {
  beforeEach(() => {
    runTransaction.mockClear();
    assertActiveAdmin.mockReset();
    assertActiveAdmin.mockResolvedValue();
    stores = {
      cost_ingredients: [],
      menu_recipes: [],
      cost_recipe_groups: [],
      cost_edge_dough: [],
    };
  });

  test('이미 단종된 제품으로는 대체할 수 없다 (resurrection 방지)', async () => {
    stores.cost_ingredients = [
      { id: 1, productCode: 'OLD01', ingredientName: '옛제품' },
      { id: 2, productCode: 'NEW01', ingredientName: '이미단종', discontinued: true },
    ];

    await expect(
      replaceIngredientProductCode('OLD01', { productCode: 'NEW01', ingredientName: '이미단종' })
    ).rejects.toThrow('이미 단종되었거나 숨김 처리된 제품으로는 대체할 수 없습니다.');

    expect(stores.cost_ingredients.find(r => r.id === 1)).toMatchObject({ productCode: 'OLD01' });
  });

  test('숨김 처리된 제품으로는 대체할 수 없다', async () => {
    stores.cost_ingredients = [
      { id: 1, productCode: 'OLD01', ingredientName: '옛제품' },
      { id: 2, productCode: 'NEW01', ingredientName: '숨김항목', excluded: true },
    ];

    await expect(
      replaceIngredientProductCode('OLD01', { productCode: 'NEW01', ingredientName: '숨김항목' })
    ).rejects.toThrow('이미 단종되었거나 숨김 처리된 제품으로는 대체할 수 없습니다.');
  });

  test('연쇄 대체(A→B→C) 시 A의 배지도 최종 목적지 C로 갱신된다', async () => {
    stores.cost_ingredients = [
      { id: 1, productCode: 'A', ingredientName: 'A', discontinued: true, replacedByProductCode: 'B' },
      { id: 2, productCode: 'B', ingredientName: 'B', replacedFromProductCode: 'A' },
      { id: 3, productCode: 'C', ingredientName: 'C' },
    ];

    await replaceIngredientProductCode('B', { productCode: 'C', ingredientName: 'C' });

    const a = stores.cost_ingredients.find(r => r.productCode === 'A');
    const b = stores.cost_ingredients.find(r => r.productCode === 'B');
    const c = stores.cost_ingredients.find(r => r.productCode === 'C');
    expect(a.replacedByProductCode).toBe('C');
    expect(b.discontinued).toBe(true);
    expect(b.replacedByProductCode).toBe('C');
    expect(c.replacedFromProductCode).toBe('B');
  });
});
