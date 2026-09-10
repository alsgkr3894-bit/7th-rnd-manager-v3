/**
 * lib/db/schema/menu-master.js — 메뉴 마스터 store
 *
 * menu_master: 전체 메뉴의 단일 진실 공급원.
 * cost_selling_prices에서 syncMenuMasterFromPrices()로 채워지며,
 * nutrition·cost·sales 등 모든 모듈이 menuCode로 참조.
 *
 * menu_recipe_versions (DB v27 추가): 레시피 저장 시점 스냅샷 이력.
 * 삭제되지 않고 계속 쌓이는 append-only 로그 — menuCode당 여러 행,
 * 최신순 조회는 'at' 인덱스로, 메뉴별 조회는 'menuCode' 인덱스로.
 */

export function createMenuMasterStores(idb) {
  if (!idb.objectStoreNames.contains('menu_master')) {
    const s = idb.createObjectStore('menu_master', { keyPath: 'id', autoIncrement: true });
    s.createIndex('menuCode', 'menuCode', { unique: true });
    s.createIndex('category', 'category');
    s.createIndex('status', 'status');
    s.createIndex('displayOrder', 'displayOrder');
  }
  if (!idb.objectStoreNames.contains('menu_recipe_versions')) {
    const v = idb.createObjectStore('menu_recipe_versions', {
      keyPath: 'id',
      autoIncrement: true,
    });
    v.createIndex('menuCode', 'menuCode');
    v.createIndex('at', 'at');
  }
}
