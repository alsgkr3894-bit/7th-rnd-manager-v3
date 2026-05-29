/**
 * lib/db/schema/cost.js — 원가계산 관련 store
 */

export function createCostStores(idb) {
  if (!idb.objectStoreNames.contains('cost_recipes')) {
    const s = idb.createObjectStore('cost_recipes', { keyPath: 'id', autoIncrement: true });
    s.createIndex('menuName', 'menuName');
    s.createIndex('menuCategory', 'menuCategory');
    s.createIndex('menuCode', 'menuCode');
  }

  if (!idb.objectStoreNames.contains('cost_ingredients')) {
    const s = idb.createObjectStore('cost_ingredients', { keyPath: 'id', autoIncrement: true });
    s.createIndex('productCode', 'productCode');
    s.createIndex('ingredientName', 'ingredientName');
  }

  if (!idb.objectStoreNames.contains('cost_selling_prices')) {
    const s = idb.createObjectStore('cost_selling_prices', { keyPath: 'id', autoIncrement: true });
    s.createIndex('menuCode', 'menuCode');
    s.createIndex('menuName', 'menuName');
    s.createIndex('size', 'size');
  }

  if (!idb.objectStoreNames.contains('cost_edge_dough')) {
    const s = idb.createObjectStore('cost_edge_dough', { keyPath: 'id', autoIncrement: true });
    s.createIndex('edgeType', 'edgeType');
    s.createIndex('size', 'size');
  }

  if (!idb.objectStoreNames.contains('cost_pizza_detail')) {
    const s = idb.createObjectStore('cost_pizza_detail', { keyPath: 'id', autoIncrement: true });
    s.createIndex('menuCode', 'menuCode');
    s.createIndex('menuName', 'menuName');
    s.createIndex('size', 'size');
  }

  if (!idb.objectStoreNames.contains('cost_personal_detail')) {
    const s = idb.createObjectStore('cost_personal_detail', { keyPath: 'id', autoIncrement: true });
    s.createIndex('menuName', 'menuName');
  }

  if (!idb.objectStoreNames.contains('cost_side_detail')) {
    const s = idb.createObjectStore('cost_side_detail', { keyPath: 'id', autoIncrement: true });
    s.createIndex('menuName', 'menuName');
  }

  if (!idb.objectStoreNames.contains('cost_set_detail')) {
    const s = idb.createObjectStore('cost_set_detail', { keyPath: 'id', autoIncrement: true });
    s.createIndex('setName', 'setName');
  }

  if (!idb.objectStoreNames.contains('cost_upload_log')) {
    const s = idb.createObjectStore('cost_upload_log', { keyPath: 'id', autoIncrement: true });
    s.createIndex('uploadType', 'uploadType');
    s.createIndex('uploadedAt', 'uploadedAt');
  }

  if (!idb.objectStoreNames.contains('cost_recipe_groups')) {
    const s = idb.createObjectStore('cost_recipe_groups', { keyPath: 'id', autoIncrement: true });
    s.createIndex('name', 'name');
  }
}
