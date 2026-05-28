/**
 * lib/db/schema/menu-master.js — 메뉴 마스터 store
 *
 * menu_master: 전체 메뉴의 단일 진실 공급원.
 * cost_selling_prices에서 syncMenuMasterFromPrices()로 채워지며,
 * nutrition·cost·sales 등 모든 모듈이 menuCode로 참조.
 */

export function createMenuMasterStores(idb) {
  if (!idb.objectStoreNames.contains('menu_master')) {
    const s = idb.createObjectStore('menu_master', { keyPath: 'id', autoIncrement: true });
    s.createIndex('menuCode',     'menuCode',     { unique: true });
    s.createIndex('category',     'category');
    s.createIndex('status',       'status');
    s.createIndex('displayOrder', 'displayOrder');
  }
}
