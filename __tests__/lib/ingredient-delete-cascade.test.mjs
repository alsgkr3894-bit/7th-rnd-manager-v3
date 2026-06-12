/**
 * B-15: deleteIngredient cascade — 영양값 스냅샷 + undo 복원
 * B-1:  deleteMenuMaster cascade — cost_selling_prices·cost_recipes·nutrition_menu_ref
 */
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

// ── DB 상태 ──────────────────────────────────────────────
let stores = {};

function storeRows(name) {
  return (stores[name] ??= []);
}

function dbGetAll(name) {
  return Promise.resolve([...storeRows(name)]);
}

function dbHasStore(name) {
  return name in stores;
}

function makeObjectStore(storeName) {
  return {
    delete(id) {
      stores[storeName] = stores[storeName].filter(r => r.id !== id);
    },
    put(record) {
      const idx = stores[storeName].findIndex(r => r.id === record.id);
      if (idx >= 0) stores[storeName][idx] = record;
      else stores[storeName].push(record);
    },
    add(record) {
      stores[storeName].push(record);
    },
  };
}

function dbRunTransaction(storeNames, mode, work) {
  const nameList = Array.isArray(storeNames) ? storeNames : [storeNames];
  const tx = {
    objectStore(name) {
      if (!nameList.includes(name)) throw new Error(`unexpected store: ${name}`);
      return makeObjectStore(name);
    },
  };
  work(tx);
  return Promise.resolve();
}

jest.unstable_mockModule('@/lib/db', () => ({
  hasStore: jest.fn(name => dbHasStore(name)),
  getAll: jest.fn(name => dbGetAll(name)),
  getByIndex: jest.fn((store, index, value) =>
    Promise.resolve(storeRows(store).filter(r => r[index] === value))
  ),
  runTransaction: jest.fn((storeNames, mode, work) => dbRunTransaction(storeNames, mode, work)),
  put: jest.fn((storeName, record) => {
    storeRows(storeName).push(record);
    return Promise.resolve();
  }),
  deleteById: jest.fn((storeName, id) => {
    stores[storeName] = stores[storeName].filter(r => r.id !== id);
    return Promise.resolve();
  }),
}));

jest.unstable_mockModule('@/lib/work-log', () => ({
  logWork: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('@/lib/active-brand', () => ({
  getActiveBrandId: () => 'main',
}));

// ── 모듈 ─────────────────────────────────────────────────

const { getIngredientValueByCode, deleteIngredientValueByCode, deleteMenuRefsByMenuCode } =
  await import('../../lib/nutrition/values/store.js');

const { deleteIngredient, bulkDeleteIngredients } = await import('../../lib/ingredient/store.js');

// ── deleteIngredient — 영양값 스냅샷 ────────────────────

describe('deleteIngredient cascade (B-15)', () => {
  beforeEach(() => {
    stores = {
      cost_ingredients: [{ id: 1, productCode: 'PC-001', ingredientName: '밀가루' }],
      nutrition_ingredient_values: [{ id: 10, productCode: 'PC-001', kcal: 350 }],
      nutrition_allergy_links: [],
    };
  });

  test('반환값이 { ingredient, nutritionSnapshot } 형태다', async () => {
    const result = await deleteIngredient(1);
    expect(result).toMatchObject({
      ingredient: { id: 1, productCode: 'PC-001', ingredientName: '밀가루' },
      nutritionSnapshot: { id: 10, productCode: 'PC-001', kcal: 350 },
    });
  });

  test('nutritionSnapshot은 cascade 삭제 전 원본 값을 담는다', async () => {
    const result = await deleteIngredient(1);
    // cascade 삭제 후에도 스냅샷 값은 삭제 전 데이터여야 함
    expect(result.nutritionSnapshot.kcal).toBe(350);
  });

  test('없는 id면 null 반환', async () => {
    const result = await deleteIngredient(999);
    expect(result).toBeNull();
  });

  test('productCode 없는 식자재는 nutritionSnapshot이 null', async () => {
    stores.cost_ingredients.push({ id: 2, ingredientName: '수동항목' });
    const result = await deleteIngredient(2);
    expect(result.nutritionSnapshot).toBeNull();
  });
});

// ── getIngredientValueByCode ─────────────────────────────

describe('getIngredientValueByCode', () => {
  beforeEach(() => {
    stores = {
      nutrition_ingredient_values: [
        { id: 10, productCode: 'PC-001', kcal: 350 },
        { id: 11, productCode: 'PC-002', kcal: 200 },
      ],
    };
  });

  test('productCode로 영양값 레코드 반환', async () => {
    const row = await getIngredientValueByCode('PC-001');
    expect(row).toMatchObject({ id: 10, kcal: 350 });
  });

  test('없는 코드면 null 반환', async () => {
    const row = await getIngredientValueByCode('NONE');
    expect(row).toBeNull();
  });

  test('store가 없으면 null 반환', async () => {
    stores = {};
    const row = await getIngredientValueByCode('PC-001');
    expect(row).toBeNull();
  });
});

// ── deleteMenuRefsByMenuCode ─────────────────────────────

describe('deleteMenuRefsByMenuCode (B-1 nutrition cascade)', () => {
  beforeEach(() => {
    stores = {
      nutrition_menu_ref: [
        { id: 1, menuCode: 'PZ-001', menuName: '피자A' },
        { id: 2, menuCode: 'PZ-001', menuName: '피자A 복사본' },
        { id: 3, menuCode: 'PZ-002', menuName: '피자B' },
      ],
      nutrition_raw_values: [
        { id: 10, menuCode: 'PZ-001', crustType: '씬' },
        { id: 11, menuCode: 'PZ-001', crustType: '석쇠' },
        { id: 12, menuCode: 'PZ-002', crustType: '씬' },
      ],
    };
  });

  test('해당 menuCode의 nutrition_menu_ref 전부 삭제', async () => {
    await deleteMenuRefsByMenuCode('PZ-001');
    const refs = stores.nutrition_menu_ref;
    expect(refs.every(r => r.menuCode !== 'PZ-001')).toBe(true);
    expect(refs.find(r => r.menuCode === 'PZ-002')).toBeDefined();
  });

  test('해당 menuCode의 nutrition_raw_values 전부 삭제', async () => {
    await deleteMenuRefsByMenuCode('PZ-001');
    const rawVals = stores.nutrition_raw_values;
    expect(rawVals.every(r => r.menuCode !== 'PZ-001')).toBe(true);
    expect(rawVals.find(r => r.menuCode === 'PZ-002')).toBeDefined();
  });

  test('menuCode 없으면 no-op', async () => {
    const before = stores.nutrition_menu_ref.length;
    await deleteMenuRefsByMenuCode('');
    expect(stores.nutrition_menu_ref.length).toBe(before);
  });
});
