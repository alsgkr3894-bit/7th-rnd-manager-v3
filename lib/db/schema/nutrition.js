/**
 * lib/db/schema/nutrition.js — 영양성분 관련 store (9개)
 *
 * nutrition_menu_ref            — 메뉴 목록 (영양성분 연결 기준)
 * nutrition_raw_values          — 베이스 영양성분값 (석쇠L/R, 씬바사삭L/R, per menu)
 * nutrition_allergy_links       — 식자재별 알레르기 체크 (ingredientId/productCode → allergenCodes[])
 * nutrition_pizza_composition   — 파생 메뉴 (베이스 메뉴 + 토핑/소스 조합)
 * nutrition_origin_master       — 식재료 원산지 마스터
 * nutrition_allergy_master      — 알레르기 항목 마스터 (22종 법정)
 * nutrition_topping_master      — 소스/토핑 영양성분 마스터
 * nutrition_edge_master         — 엣지 추가 영양성분 (치즈크러스트L/R, 골드스윗L/R)
 * nutrition_ingredient_values   — 식자재별 100g 기준 영양성분 (자동계산용)
 */

export function createNutritionStores(idb) {
  if (!idb.objectStoreNames.contains('nutrition_menu_ref')) {
    const s = idb.createObjectStore('nutrition_menu_ref', { keyPath: 'id', autoIncrement: true });
    s.createIndex('menuCode', 'menuCode');
    s.createIndex('category', 'category');
    s.createIndex('displayOrder', 'displayOrder');
  }

  if (!idb.objectStoreNames.contains('nutrition_raw_values')) {
    const s = idb.createObjectStore('nutrition_raw_values', { keyPath: 'id', autoIncrement: true });
    s.createIndex('menuCode', 'menuCode');
    s.createIndex('crustType', 'crustType');
    s.createIndex('menu_crust', ['menuCode', 'crustType']);
  }

  if (!idb.objectStoreNames.contains('nutrition_allergy_links')) {
    const s = idb.createObjectStore('nutrition_allergy_links', {
      keyPath: 'id',
      autoIncrement: true,
    });
    s.createIndex('ingredientId', 'ingredientId');
    s.createIndex('productCode', 'productCode');
  }

  if (!idb.objectStoreNames.contains('nutrition_pizza_composition')) {
    const s = idb.createObjectStore('nutrition_pizza_composition', {
      keyPath: 'id',
      autoIncrement: true,
    });
    s.createIndex('menuCode', 'menuCode');
    s.createIndex('baseMenuCode', 'baseMenuCode');
  }

  if (!idb.objectStoreNames.contains('nutrition_origin_master')) {
    const s = idb.createObjectStore('nutrition_origin_master', {
      keyPath: 'id',
      autoIncrement: true,
    });
    s.createIndex('ingredientName', 'ingredientName');
    s.createIndex('category', 'category');
    s.createIndex('displayOrder', 'displayOrder');
  }

  if (!idb.objectStoreNames.contains('nutrition_allergy_master')) {
    const s = idb.createObjectStore('nutrition_allergy_master', {
      keyPath: 'id',
      autoIncrement: true,
    });
    s.createIndex('allergenCode', 'allergenCode');
    s.createIndex('displayOrder', 'displayOrder');
  }

  if (!idb.objectStoreNames.contains('nutrition_topping_master')) {
    const s = idb.createObjectStore('nutrition_topping_master', {
      keyPath: 'id',
      autoIncrement: true,
    });
    s.createIndex('toppingCode', 'toppingCode');
    s.createIndex('displayOrder', 'displayOrder');
  }

  if (!idb.objectStoreNames.contains('nutrition_edge_master')) {
    const s = idb.createObjectStore('nutrition_edge_master', {
      keyPath: 'id',
      autoIncrement: true,
    });
    s.createIndex('edgeCode', 'edgeCode');
    s.createIndex('displayOrder', 'displayOrder');
  }

  if (!idb.objectStoreNames.contains('nutrition_ingredient_values')) {
    const s = idb.createObjectStore('nutrition_ingredient_values', {
      keyPath: 'id',
      autoIncrement: true,
    });
    s.createIndex('productCode', 'productCode', { unique: true });
  }

  if (!idb.objectStoreNames.contains('nutrition_set_composition')) {
    const s = idb.createObjectStore('nutrition_set_composition', {
      keyPath: 'id',
      autoIncrement: true,
    });
    s.createIndex('setCode', 'setCode');
    s.createIndex('kind', 'kind');
  }
}
