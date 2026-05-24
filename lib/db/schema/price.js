/**
 * lib/db/schema/price.js — 제때 상품 가격 관련 store
 */

export function createPriceStores(idb) {
  if (!idb.objectStoreNames.contains('price_files')) {
    const s = idb.createObjectStore('price_files', { keyPath: 'id', autoIncrement: true });
    s.createIndex('updateDate', 'updateDate', { unique: true });
  }

  if (!idb.objectStoreNames.contains('price_rows')) {
    const s = idb.createObjectStore('price_rows', { keyPath: 'id', autoIncrement: true });
    s.createIndex('fileId', 'fileId');
    s.createIndex('updateDate', 'updateDate');
    s.createIndex('productCode', 'productCode');
    s.createIndex('fileId_productCode', ['fileId', 'productCode']);
  }
}
