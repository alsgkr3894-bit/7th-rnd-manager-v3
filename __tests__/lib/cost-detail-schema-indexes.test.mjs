import { DB_VERSION } from '../../lib/db/constants.js';
import { createCostStores } from '../../lib/db/schema/cost.js';
import { createStores } from '../../lib/db/schema/index.js';

function makeStore(name, initialIndexes = []) {
  const indexes = new Map(initialIndexes.map(indexName => [indexName, { indexName }]));
  return {
    name,
    indexes,
    indexNames: {
      contains(indexName) {
        return indexes.has(indexName);
      },
    },
    createIndex(indexName, keyPath, options) {
      indexes.set(indexName, { indexName, keyPath, options });
    },
    deleteIndex(indexName) {
      indexes.delete(indexName);
    },
  };
}

function makeIdbStub(existing = {}) {
  const stores = new Map(Object.entries(existing));
  const deleted = [];
  return {
    stores,
    deleted,
    created: {},
    objectStoreNames: {
      contains(name) {
        return stores.has(name);
      },
    },
    createObjectStore(name) {
      const store = makeStore(name);
      stores.set(name, store);
      this.created[name] = store;
      return store;
    },
    deleteObjectStore(name) {
      stores.delete(name);
      deleted.push(name);
    },
  };
}

function makeUpgradeTx(idb) {
  return {
    objectStore(name) {
      const store = idb.stores.get(name);
      if (!store) throw new Error(`missing store: ${name}`);
      return store;
    },
  };
}

function indexNames(store) {
  return [...store.indexes.keys()];
}

describe('legacy cost recipe schema cleanup', () => {
  test('DB_VERSION is bumped for legacy recipe store removal', () => {
    expect(DB_VERSION).toBe(24);
  });

  test('new cost schema creates canonical menu_recipes only', () => {
    const idb = makeIdbStub();

    createCostStores(idb);

    expect(indexNames(idb.created.menu_recipes)).toEqual([
      'menuCode',
      'displayGroupKey',
      'category',
      'kind',
      'updatedAt',
    ]);
    expect(idb.created.cost_recipes).toBeUndefined();
    expect(idb.created.cost_pizza_detail).toBeUndefined();
    expect(idb.created.cost_personal_detail).toBeUndefined();
    expect(idb.created.cost_side_detail).toBeUndefined();
    expect(idb.created.cost_set_detail).toBeUndefined();
  });

  test('v22 migration deletes existing legacy recipe stores', () => {
    const idb = makeIdbStub({
      cost_recipes: makeStore('cost_recipes', ['menuName']),
      cost_pizza_detail: makeStore('cost_pizza_detail', ['menuName', 'size']),
      cost_personal_detail: makeStore('cost_personal_detail', ['menuName']),
      cost_side_detail: makeStore('cost_side_detail', ['menuName']),
      cost_set_detail: makeStore('cost_set_detail', ['setName']),
    });

    createStores(idb, 21, makeUpgradeTx(idb));

    expect(idb.deleted).toEqual([
      'cost_recipes',
      'cost_pizza_detail',
      'cost_personal_detail',
      'cost_side_detail',
      'cost_set_detail',
    ]);
    expect(idb.stores.has('cost_recipes')).toBe(false);
    expect(idb.stores.has('cost_pizza_detail')).toBe(false);
    expect(idb.stores.has('cost_personal_detail')).toBe(false);
    expect(idb.stores.has('cost_side_detail')).toBe(false);
    expect(idb.stores.has('cost_set_detail')).toBe(false);
  });

  test('v23 migration deletes ingredient nutrition value store', () => {
    const idb = makeIdbStub({
      nutrition_ingredient_values: makeStore('nutrition_ingredient_values', ['productCode']),
    });

    createStores(idb, 22, makeUpgradeTx(idb));

    expect(idb.deleted).toEqual(['nutrition_ingredient_values']);
    expect(idb.stores.has('nutrition_ingredient_values')).toBe(false);
  });
});
