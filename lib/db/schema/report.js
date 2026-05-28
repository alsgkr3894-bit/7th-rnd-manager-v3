/**
 * lib/db/schema/report.js — 보고서센터 store
 */

export function createReportStores(idb) {
  if (!idb.objectStoreNames.contains('generated_reports')) {
    const s = idb.createObjectStore('generated_reports', { keyPath: 'id', autoIncrement: true });
    s.createIndex('kind', 'kind');
    s.createIndex('createdAt', 'createdAt');
    s.createIndex('fav', 'fav');
  }
}
