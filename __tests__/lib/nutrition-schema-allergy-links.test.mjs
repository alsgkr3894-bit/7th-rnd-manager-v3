import { createNutritionStores } from '../../lib/db/schema/nutrition.js';
import { createStores } from '../../lib/db/schema/index.js';

function makeStore(name) {
  return {
    name,
    indexes: new Map(),
    indexNames: { contains: n => false },
    createIndex() {},
    deleteIndex() {},
  };
}

function makeIdbStub(existing = {}) {
  const stores = new Map(Object.entries(existing));
  const deleted = [];
  return {
    stores,
    deleted,
    objectStoreNames: { contains: name => stores.has(name) },
    createObjectStore(name) {
      const store = makeStore(name);
      stores.set(name, store);
      return store;
    },
    deleteObjectStore(name) {
      stores.delete(name);
      deleted.push(name);
    },
  };
}

describe('nutrition schema allergy links', () => {
  test('createNutritionStores는 nutrition_allergy_links를 생성하지 않는다 (v20 이후 제거)', () => {
    const idb = makeIdbStub();
    createNutritionStores(idb);
    expect(idb.stores.has('nutrition_allergy_links')).toBe(false);
  });

  test('v20 마이그레이션: 기존 DB에서 nutrition_allergy_links를 삭제한다', () => {
    const idb = makeIdbStub({
      nutrition_allergy_links: makeStore('nutrition_allergy_links'),
    });
    createStores(idb, 19, null);
    expect(idb.deleted).toContain('nutrition_allergy_links');
    expect(idb.stores.has('nutrition_allergy_links')).toBe(false);
  });

  test('v20 마이그레이션: nutrition_allergy_links가 없어도 오류 없이 통과한다', () => {
    const idb = makeIdbStub();
    expect(() => createStores(idb, 19, null)).not.toThrow();
    expect(idb.deleted).toHaveLength(0);
  });
});
