/**
 * lib/db/schema.js — IndexedDB store 정의
 *
 * onupgradeneeded에서 호출. store가 없으면 생성, 인덱스 정의.
 * 점진 확장: sales 모듈부터 시작, 다른 모듈은 페이지 이식 시 추가.
 *
 * v2 src/core/db.js의 _createStores 함수에서 sales 관련 부분 발췌.
 */

/**
 * @param {IDBDatabase} idb
 * @param {number} oldVersion - 이전 DB 버전 (0 = 신규)
 */
export function createStores(idb, oldVersion = 0) {
  // ── 공통 ──────────────────────────────────────────────────────

  if (!idb.objectStoreNames.contains('settings')) {
    idb.createObjectStore('settings', { keyPath: 'key' });
  }

  if (!idb.objectStoreNames.contains('upload_log')) {
    const s = idb.createObjectStore('upload_log', { keyPath: 'id', autoIncrement: true });
    s.createIndex('module',       'module',       { unique: false });
    s.createIndex('fileHash',     'fileHash',     { unique: false });
    s.createIndex('linkedFileId', 'linkedFileId', { unique: false });
    s.createIndex('uploadedAt',   'uploadedAt',   { unique: false });
  }

  // ── sales (메뉴판매량) ────────────────────────────────────────

  if (!idb.objectStoreNames.contains('sales_files')) {
    const s = idb.createObjectStore('sales_files', { keyPath: 'id', autoIncrement: true });
    s.createIndex('year',    'year',    { unique: false });
    s.createIndex('month',   'month',   { unique: false });
    s.createIndex('yearMonth', ['year', 'month'], { unique: false });
  }

  if (!idb.objectStoreNames.contains('sales_rows')) {
    const s = idb.createObjectStore('sales_rows', { keyPath: 'id', autoIncrement: true });
    s.createIndex('fileId',   'fileId',   { unique: false });
    s.createIndex('category', 'category', { unique: false });
    s.createIndex('status',   'status',   { unique: false });
  }

  if (!idb.objectStoreNames.contains('sales_rules')) {
    idb.createObjectStore('sales_rules', { keyPath: 'id', autoIncrement: true });
  }

  if (!idb.objectStoreNames.contains('menu_sales_issues')) {
    const s = idb.createObjectStore('menu_sales_issues', { keyPath: 'id', autoIncrement: true });
    s.createIndex('fileId', 'fileId', { unique: false });
    s.createIndex('issueType', 'issueType', { unique: false });
  }

  if (!idb.objectStoreNames.contains('ref_sales_categories')) {
    idb.createObjectStore('ref_sales_categories', { keyPath: 'category' });
  }

  if (!idb.objectStoreNames.contains('ref_sales_aliases')) {
    const s = idb.createObjectStore('ref_sales_aliases', { keyPath: 'id', autoIncrement: true });
    s.createIndex('aliasNorm', 'aliasNorm', { unique: true });
  }

  if (!idb.objectStoreNames.contains('ref_excluded')) {
    const s = idb.createObjectStore('ref_excluded', { keyPath: 'id', autoIncrement: true });
    s.createIndex('menuNorm', 'menuNorm', { unique: true });
  }

  if (!idb.objectStoreNames.contains('ref_discontinued')) {
    const s = idb.createObjectStore('ref_discontinued', { keyPath: 'id', autoIncrement: true });
    s.createIndex('menuNorm', 'menuNorm', { unique: true });
  }

  if (!idb.objectStoreNames.contains('ref_event_menus')) {
    const s = idb.createObjectStore('ref_event_menus', { keyPath: 'id', autoIncrement: true });
    s.createIndex('menuNorm', 'menuNorm', { unique: true });
  }

  // ── price, shipment, cost, nutrition은 이식 시 여기에 추가 ──
}
