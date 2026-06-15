/**
 * lib/db/schema/cost.js — 원가계산 관련 store
 */

export function createCostStores(idb) {
  if (!idb.objectStoreNames.contains('menu_recipes')) {
    const s = idb.createObjectStore('menu_recipes', { keyPath: 'id', autoIncrement: true });
    s.createIndex('menuCode', 'menuCode', { unique: true });
    s.createIndex('displayGroupKey', 'displayGroupKey');
    s.createIndex('category', 'category');
    s.createIndex('kind', 'kind');
    s.createIndex('updatedAt', 'updatedAt');
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
