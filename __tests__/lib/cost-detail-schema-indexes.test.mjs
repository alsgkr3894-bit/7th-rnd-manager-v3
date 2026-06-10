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
  return {
    stores,
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

describe('cost detail schema indexes', () => {
  test('DB_VERSION is bumped for detail menuCode index migration', () => {
    expect(DB_VERSION).toBe(18);
  });

  test('new detail stores include menuCode indexes', () => {
    const idb = makeIdbStub();

    createCostStores(idb);

    expect(indexNames(idb.created.cost_pizza_detail)).toEqual(['menuCode', 'menuName', 'size']);
    expect(indexNames(idb.created.cost_personal_detail)).toEqual(['menuCode', 'menuName']);
    expect(indexNames(idb.created.cost_side_detail)).toEqual(['menuCode', 'menuName']);
    expect(indexNames(idb.created.cost_set_detail)).toEqual(['menuCode', 'setName']);
  });

  test('v18 migration adds missing menuCode indexes to existing detail stores', () => {
    const idb = makeIdbStub({
      cost_pizza_detail: makeStore('cost_pizza_detail', ['menuName', 'size']),
      cost_personal_detail: makeStore('cost_personal_detail', ['menuName']),
      cost_side_detail: makeStore('cost_side_detail', ['menuName']),
      cost_set_detail: makeStore('cost_set_detail', ['setName']),
    });

    createStores(idb, 17, makeUpgradeTx(idb));

    expect(indexNames(idb.stores.get('cost_pizza_detail'))).toEqual([
      'menuName',
      'size',
      'menuCode',
    ]);
    expect(indexNames(idb.stores.get('cost_personal_detail'))).toEqual(['menuName', 'menuCode']);
    expect(indexNames(idb.stores.get('cost_side_detail'))).toEqual(['menuName', 'menuCode']);
    expect(indexNames(idb.stores.get('cost_set_detail'))).toEqual(['setName', 'menuCode']);
  });
});
