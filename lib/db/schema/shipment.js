/**
 * lib/db/schema/shipment.js — 제때 출고량 관련 store
 */

export function createShipmentStores(idb) {
  if (!idb.objectStoreNames.contains('shipment_files')) {
    idb.createObjectStore('shipment_files', { keyPath: 'id', autoIncrement: true });
  }

  if (!idb.objectStoreNames.contains('shipment_rows')) {
    const s = idb.createObjectStore('shipment_rows', { keyPath: 'id', autoIncrement: true });
    s.createIndex('fileId', 'fileId');
    s.createIndex('productCode', 'productCode');
    s.createIndex('year_month', ['year', 'month']);
  }

  if (!idb.objectStoreNames.contains('ref_shipment_products')) {
    const s = idb.createObjectStore('ref_shipment_products', { keyPath: 'id', autoIncrement: true });
    s.createIndex('productCode', 'productCode', { unique: true });
    s.createIndex('enable', 'enable');
  }

  if (!idb.objectStoreNames.contains('ref_shipment_rules')) {
    const s = idb.createObjectStore('ref_shipment_rules', { keyPath: 'id', autoIncrement: true });
    s.createIndex('rawName', 'rawName');
    s.createIndex('mappedCode', 'mappedCode');
    s.createIndex('enable', 'enable');
  }
}
