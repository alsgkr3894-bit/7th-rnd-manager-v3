/**
 * lib/db/schema/sales.js — 메뉴판매량 관련 store
 *
 * sales_files, sales_rows, sales_rules, menu_sales_issues,
 * ref_sales_categories, ref_sales_aliases, ref_excluded, ref_discontinued, ref_event_menus
 */

export function createSalesStores(idb) {
  if (!idb.objectStoreNames.contains('sales_files')) {
    const s = idb.createObjectStore('sales_files', { keyPath: 'id', autoIncrement: true });
    s.createIndex('year_month', ['year', 'month']);
  }

  if (!idb.objectStoreNames.contains('sales_rows')) {
    const s = idb.createObjectStore('sales_rows', { keyPath: 'id', autoIncrement: true });
    s.createIndex('fileId', 'fileId');
    s.createIndex('category', 'category');
    s.createIndex('normalizedMenuName', 'normalizedMenuName');
    s.createIndex('year_month', ['year', 'month']);
    s.createIndex('category_normalizedMenuName', ['category', 'normalizedMenuName']);
    s.createIndex('status', 'status');
  }

  if (!idb.objectStoreNames.contains('sales_rules')) {
    const s = idb.createObjectStore('sales_rules', { keyPath: 'id', autoIncrement: true });
    s.createIndex('rawMenuName', 'rawMenuName');
    s.createIndex('enable', 'enable');
  }

  if (!idb.objectStoreNames.contains('menu_sales_issues')) {
    const s = idb.createObjectStore('menu_sales_issues', { keyPath: 'id', autoIncrement: true });
    s.createIndex('fileId', 'fileId');
    s.createIndex('issueType', 'issueType');
    s.createIndex('status', 'status');
    s.createIndex('year_month', ['year', 'month']);
  }

  if (!idb.objectStoreNames.contains('ref_sales_categories')) {
    const s = idb.createObjectStore('ref_sales_categories', { keyPath: 'id', autoIncrement: true });
    s.createIndex('categoryName', 'categoryName', { unique: true });
    s.createIndex('displayOrder', 'displayOrder');
    s.createIndex('enabled', 'enabled');
  }

  if (!idb.objectStoreNames.contains('ref_sales_aliases')) {
    const s = idb.createObjectStore('ref_sales_aliases', { keyPath: 'id', autoIncrement: true });
    s.createIndex('rawName', 'rawName');
    s.createIndex('enable', 'enable');
  }

  if (!idb.objectStoreNames.contains('ref_excluded')) {
    const s = idb.createObjectStore('ref_excluded', { keyPath: 'id', autoIncrement: true });
    s.createIndex('menuName', 'menuName');
  }

  if (!idb.objectStoreNames.contains('ref_discontinued')) {
    const s = idb.createObjectStore('ref_discontinued', { keyPath: 'id', autoIncrement: true });
    s.createIndex('menuName', 'menuName');
  }

  if (!idb.objectStoreNames.contains('ref_event_menus')) {
    const s = idb.createObjectStore('ref_event_menus', { keyPath: 'id', autoIncrement: true });
    s.createIndex('menuName', 'menuName');
  }
}
