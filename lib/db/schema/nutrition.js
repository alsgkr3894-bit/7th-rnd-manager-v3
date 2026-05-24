/**
 * lib/db/schema/nutrition.js — 영양성분 컴플라이언스 관련 store (15개)
 *
 * v2 DB v7에서 추가된 store들. menu_ref / raw_values / 링크(origin/allergy) /
 * composition(pizza/set/halfhalf) / master(origin/allergy/topping/beverage/edge) /
 * versions / change_log / export_snapshots
 */

export function createNutritionStores(idb) {
  if (!idb.objectStoreNames.contains('nutrition_menu_ref')) {
    const s = idb.createObjectStore('nutrition_menu_ref', { keyPath: 'id', autoIncrement: true });
    s.createIndex('nutritionItemCode', 'nutritionItemCode');
    s.createIndex('costMenuCode', 'costMenuCode');
    s.createIndex('costSetCode', 'costSetCode');
    s.createIndex('category', 'category');
    s.createIndex('status', 'status');
    s.createIndex('isActive', 'isActive');
    s.createIndex('displayOrder', 'displayOrder');
    s.createIndex('appliedAt', 'appliedAt');
    s.createIndex('retiredAt', 'retiredAt');
  }

  if (!idb.objectStoreNames.contains('nutrition_raw_values')) {
    const s = idb.createObjectStore('nutrition_raw_values', { keyPath: 'id', autoIncrement: true });
    s.createIndex('subjectType', 'subjectType');
    s.createIndex('subjectId', 'subjectId');
    s.createIndex('status', 'status');
    s.createIndex('dataSource', 'dataSource');
    s.createIndex('appliedAt', 'appliedAt');
    s.createIndex('retiredAt', 'retiredAt');
    s.createIndex('changeGroupId', 'changeGroupId');
    s.createIndex('subject_ref', ['subjectType', 'subjectId']);
  }

  if (!idb.objectStoreNames.contains('nutrition_origin_links')) {
    const s = idb.createObjectStore('nutrition_origin_links', { keyPath: 'id', autoIncrement: true });
    s.createIndex('subjectType', 'subjectType');
    s.createIndex('subjectId', 'subjectId');
    s.createIndex('originId', 'originId');
    s.createIndex('status', 'status');
    s.createIndex('appliedAt', 'appliedAt');
    s.createIndex('retiredAt', 'retiredAt');
    s.createIndex('changeGroupId', 'changeGroupId');
    s.createIndex('subject_ref', ['subjectType', 'subjectId']);
  }

  if (!idb.objectStoreNames.contains('nutrition_allergy_links')) {
    const s = idb.createObjectStore('nutrition_allergy_links', { keyPath: 'id', autoIncrement: true });
    s.createIndex('subjectType', 'subjectType');
    s.createIndex('subjectId', 'subjectId');
    s.createIndex('allergyId', 'allergyId');
    s.createIndex('status', 'status');
    s.createIndex('appliedAt', 'appliedAt');
    s.createIndex('retiredAt', 'retiredAt');
    s.createIndex('changeGroupId', 'changeGroupId');
    s.createIndex('subject_ref', ['subjectType', 'subjectId']);
  }

  if (!idb.objectStoreNames.contains('nutrition_pizza_composition')) {
    const s = idb.createObjectStore('nutrition_pizza_composition', { keyPath: 'id', autoIncrement: true });
    s.createIndex('menuRefId', 'menuRefId');
    s.createIndex('sizeCode', 'sizeCode');
    s.createIndex('baseEdgeCode', 'baseEdgeCode');
    s.createIndex('addedEdgeCode', 'addedEdgeCode');
    s.createIndex('status', 'status');
    s.createIndex('appliedAt', 'appliedAt');
    s.createIndex('retiredAt', 'retiredAt');
    s.createIndex('changeGroupId', 'changeGroupId');
  }

  if (!idb.objectStoreNames.contains('nutrition_set_composition')) {
    const s = idb.createObjectStore('nutrition_set_composition', { keyPath: 'id', autoIncrement: true });
    s.createIndex('menuRefId', 'menuRefId');
    s.createIndex('setCode', 'setCode');
    s.createIndex('status', 'status');
    s.createIndex('appliedAt', 'appliedAt');
    s.createIndex('retiredAt', 'retiredAt');
    s.createIndex('changeGroupId', 'changeGroupId');
  }

  if (!idb.objectStoreNames.contains('nutrition_halfhalf_results')) {
    const s = idb.createObjectStore('nutrition_halfhalf_results', { keyPath: 'id', autoIncrement: true });
    s.createIndex('menuRefId', 'menuRefId');
    s.createIndex('sizeCode', 'sizeCode');
    s.createIndex('status', 'status');
    s.createIndex('appliedAt', 'appliedAt');
    s.createIndex('retiredAt', 'retiredAt');
    s.createIndex('changeGroupId', 'changeGroupId');
  }

  if (!idb.objectStoreNames.contains('nutrition_origin_master')) {
    const s = idb.createObjectStore('nutrition_origin_master', { keyPath: 'id', autoIncrement: true });
    s.createIndex('originCode', 'originCode');
    s.createIndex('originName', 'originName');
    s.createIndex('status', 'status');
    s.createIndex('isActive', 'isActive');
    s.createIndex('displayOrder', 'displayOrder');
  }

  if (!idb.objectStoreNames.contains('nutrition_allergy_master')) {
    const s = idb.createObjectStore('nutrition_allergy_master', { keyPath: 'id', autoIncrement: true });
    s.createIndex('allergyCode', 'allergyCode');
    s.createIndex('allergyName', 'allergyName');
    s.createIndex('displayName', 'displayName');
    s.createIndex('status', 'status');
    s.createIndex('isActive', 'isActive');
    s.createIndex('displayOrder', 'displayOrder');
  }

  if (!idb.objectStoreNames.contains('nutrition_topping_master')) {
    const s = idb.createObjectStore('nutrition_topping_master', { keyPath: 'id', autoIncrement: true });
    s.createIndex('toppingCode', 'toppingCode');
    s.createIndex('displayName', 'displayName');
    s.createIndex('status', 'status');
    s.createIndex('isActive', 'isActive');
    s.createIndex('displayOrder', 'displayOrder');
  }

  if (!idb.objectStoreNames.contains('nutrition_beverage_master')) {
    const s = idb.createObjectStore('nutrition_beverage_master', { keyPath: 'id', autoIncrement: true });
    s.createIndex('beverageCode', 'beverageCode');
    s.createIndex('displayName', 'displayName');
    s.createIndex('volume', 'volume');
    s.createIndex('status', 'status');
    s.createIndex('isActive', 'isActive');
    s.createIndex('displayOrder', 'displayOrder');
  }

  if (!idb.objectStoreNames.contains('nutrition_edge_master')) {
    const s = idb.createObjectStore('nutrition_edge_master', { keyPath: 'id', autoIncrement: true });
    s.createIndex('edgeCode', 'edgeCode');
    s.createIndex('displayName', 'displayName');
    s.createIndex('status', 'status');
    s.createIndex('isActive', 'isActive');
    s.createIndex('displayOrder', 'displayOrder');
    s.createIndex('isLAvailable', 'isLAvailable');
    s.createIndex('isRAvailable', 'isRAvailable');
  }

  if (!idb.objectStoreNames.contains('nutrition_versions')) {
    const s = idb.createObjectStore('nutrition_versions', { keyPath: 'id', autoIncrement: true });
    s.createIndex('changeGroupCode', 'changeGroupCode');
    s.createIndex('status', 'status');
    s.createIndex('createdAt', 'createdAt');
    s.createIndex('appliedAt', 'appliedAt');
    s.createIndex('createdBy', 'createdBy');
  }

  if (!idb.objectStoreNames.contains('nutrition_change_log')) {
    const s = idb.createObjectStore('nutrition_change_log', { keyPath: 'id', autoIncrement: true });
    s.createIndex('changeGroupId', 'changeGroupId');
    s.createIndex('targetStore', 'targetStore');
    s.createIndex('targetId', 'targetId');
    s.createIndex('action', 'action');
    s.createIndex('createdAt', 'createdAt');
    s.createIndex('createdBy', 'createdBy');
  }

  if (!idb.objectStoreNames.contains('nutrition_export_snapshots')) {
    const s = idb.createObjectStore('nutrition_export_snapshots', { keyPath: 'id', autoIncrement: true });
    s.createIndex('exportType', 'exportType');
    s.createIndex('referenceDate', 'referenceDate');
    s.createIndex('generatedAt', 'generatedAt');
    s.createIndex('status', 'status');
    s.createIndex('changeGroupId', 'changeGroupId');
  }
}
