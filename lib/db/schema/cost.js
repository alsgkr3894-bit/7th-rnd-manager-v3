/**
 * lib/db/schema/cost.js — 원가계산 관련 store
 */

export const COST_DETAIL_STORE_INDEXES = {
  cost_pizza_detail: [
    ['menuCode', 'menuCode'],
    ['menuName', 'menuName'],
    ['size', 'size'],
  ],
  cost_personal_detail: [
    ['menuCode', 'menuCode'],
    ['menuName', 'menuName'],
  ],
  cost_side_detail: [
    ['menuCode', 'menuCode'],
    ['menuName', 'menuName'],
  ],
  cost_set_detail: [
    ['menuCode', 'menuCode'],
    ['setName', 'setName'],
  ],
};

function createIndexedStore(idb, storeName, indexes) {
  const s = idb.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
  for (const [indexName, keyPath, options] of indexes) {
    s.createIndex(indexName, keyPath, options);
  }
  return s;
}

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
    createIndexedStore(idb, 'cost_pizza_detail', COST_DETAIL_STORE_INDEXES.cost_pizza_detail);
  }

  if (!idb.objectStoreNames.contains('cost_personal_detail')) {
    createIndexedStore(
      idb,
      'cost_personal_detail',
      COST_DETAIL_STORE_INDEXES.cost_personal_detail
    );
  }

  if (!idb.objectStoreNames.contains('cost_side_detail')) {
    createIndexedStore(idb, 'cost_side_detail', COST_DETAIL_STORE_INDEXES.cost_side_detail);
  }

  if (!idb.objectStoreNames.contains('cost_set_detail')) {
    createIndexedStore(idb, 'cost_set_detail', COST_DETAIL_STORE_INDEXES.cost_set_detail);
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

  // v12: 식자재 공급업체 마스터
  if (!idb.objectStoreNames.contains('cost_suppliers')) {
    const s = idb.createObjectStore('cost_suppliers', { keyPath: 'id', autoIncrement: true });
    s.createIndex('name', 'name');
  }

  // v12: 원가 마진 추이 스냅샷 (제때 단가 업로드/수동 캡처 시 기록)
  if (!idb.objectStoreNames.contains('cost_margin_snapshots')) {
    const s = idb.createObjectStore('cost_margin_snapshots', {
      keyPath: 'id',
      autoIncrement: true,
    });
    s.createIndex('capturedAt', 'capturedAt');
  }

  // v13: 식자재 단가 변경 이력
  if (!idb.objectStoreNames.contains('cost_ingredient_price_history')) {
    const s = idb.createObjectStore('cost_ingredient_price_history', {
      keyPath: 'id',
      autoIncrement: true,
    });
    s.createIndex('ingredientId', 'ingredientId');
    s.createIndex('changedAt', 'changedAt');
  }

  // v13: 플랫폼 수수료 설정 (localStorage 미러링 — 백업/복원 포함, 싱글톤 id='config')
  if (!idb.objectStoreNames.contains('cost_platform_fees')) {
    idb.createObjectStore('cost_platform_fees', { keyPath: 'id' });
  }
}
