import { createNutritionStores } from '../../lib/db/schema/nutrition.js';

function makeIdbStub() {
  const stores = new Set();
  const created = {};
  return {
    created,
    objectStoreNames: {
      contains(name) {
        return stores.has(name);
      },
    },
    createObjectStore(name) {
      stores.add(name);
      const store = {
        indexes: [],
        createIndex(indexName, keyPath, options) {
          this.indexes.push({ indexName, keyPath, options });
        },
      };
      created[name] = store;
      return store;
    },
  };
}

describe('nutrition schema allergy links', () => {
  test('신규 nutrition_allergy_links는 식자재 기준 인덱스를 만든다', () => {
    const idb = makeIdbStub();
    createNutritionStores(idb);

    const indexes = idb.created.nutrition_allergy_links.indexes.map(index => index.indexName);
    expect(indexes).toEqual(['ingredientId', 'productCode']);
    expect(indexes).not.toContain('menuCode');
    expect(indexes).not.toContain('allergenCode');
  });
});
