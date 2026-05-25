/**
 * lib/shipment/store.js — shipment_files / shipment_rows / ref_shipment_products / upload_log
 *
 * 정책:
 *   - 70개 대상 제품만 shipment_rows에 저장 (filterTargetRows 적용 후)
 *   - 대상 외 행은 DB 저장 / 집계 / CSV 다운로드에서 제외 — 오류 아님
 *   - 같은 fileHash는 중복 차단 (DUPLICATE_HASH)
 */

import { getAll, getByIndex, runTransaction, hasStore } from '../db';
import { INITIAL_MANAGED_PRODUCTS } from './products.js';
import { normalizeProductName } from '../normalize';

/** 모든 shipment_files (최신순) */
export async function getShipmentFiles() {
  if (!hasStore('shipment_files')) return [];
  const files = await getAll('shipment_files');
  return files.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    if (a.month !== b.month) return b.month - a.month;
    return (b.uploadedAt || '').localeCompare(a.uploadedAt || '');
  });
}

/** fileId에 연결된 shipment_rows */
export async function getShipmentRowsByFileId(fileId) {
  if (!hasStore('shipment_rows')) return [];
  return getByIndex('shipment_rows', 'fileId', fileId);
}

/** 같은 fileHash가 upload_log에 있는지 (module=shipment) */
export async function checkHashExists(fileHash) {
  if (!hasStore('upload_log') || !fileHash) return false;
  const logs = await getByIndex('upload_log', 'fileHash', fileHash);
  return logs.some(l => l.module === 'shipment');
}

/**
 * 관리품목 70개 시드 (앱 진입 시 ref_shipment_products가 비어 있으면 1회 실행).
 * INITIAL_MANAGED_PRODUCTS 그대로 등록.
 */
export async function seedManagedProductsIfEmpty() {
  if (!hasStore('ref_shipment_products')) return;
  const existing = await getAll('ref_shipment_products');
  if (existing.length > 0) return; // 이미 시드됨
  await runTransaction(['ref_shipment_products'], 'readwrite', tx => {
    const store = tx.objectStore('ref_shipment_products');
    for (const p of INITIAL_MANAGED_PRODUCTS) {
      store.add({
        productCode: p.productCode,
        productName: p.productName,
        normalizedProductName: normalizeProductName(p.productName),
        enable: true,
        isSevenManaged: p.isSevenManaged ?? false,
        createdAt: new Date().toISOString(),
      });
    }
  });
}

/** 모든 관리품목 (enable=true만) */
export async function getManagedProducts() {
  if (!hasStore('ref_shipment_products')) return [];
  const all = await getAll('ref_shipment_products');
  return all.filter(p => p.enable !== false);
}

/**
 * shipment_files + shipment_rows + upload_log 원자적 저장.
 *
 * @param {{ meta, rows, log }} payload
 * @returns {number} fileId
 * @throws Error('DUPLICATE_HASH')
 */
export async function saveShipmentUpload({ meta, rows, log }) {
  if (await checkHashExists(log.fileHash)) throw new Error('DUPLICATE_HASH');

  let fileId;
  await runTransaction(['shipment_files', 'shipment_rows', 'upload_log'], 'readwrite', (tx) => {
    const fileReq = tx.objectStore('shipment_files').add(meta);
    fileReq.onerror = () => tx.abort();
    fileReq.onsuccess = () => {
      fileId = fileReq.result;
      const rowStore = tx.objectStore('shipment_rows');
      for (const r of rows) {
        rowStore.add({ ...r, fileId, year: meta.year, month: meta.month });
      }
      tx.objectStore('upload_log').add({ ...log, linkedFileId: fileId });
    };
  });
  return fileId;
}

/**
 * shipment_files 단건 삭제 + 연결된 shipment_rows / upload_log 모두 삭제.
 */
export async function deleteShipmentFile(fileId) {
  const rowIds = hasStore('shipment_rows')
    ? (await getByIndex('shipment_rows', 'fileId', fileId)).map(r => r.id)
    : [];
  const logIds = hasStore('upload_log')
    ? (await getAll('upload_log')).filter(l => l.linkedFileId === fileId).map(l => l.id)
    : [];

  const stores = [];
  if (hasStore('shipment_files')) stores.push('shipment_files');
  if (hasStore('shipment_rows'))  stores.push('shipment_rows');
  if (hasStore('upload_log'))     stores.push('upload_log');

  await runTransaction(stores, 'readwrite', tx => {
    if (hasStore('shipment_files'))   tx.objectStore('shipment_files').delete(fileId);
    if (rowIds.length > 0) {
      const s = tx.objectStore('shipment_rows');
      for (const id of rowIds) s.delete(id);
    }
    if (logIds.length > 0) {
      const s = tx.objectStore('upload_log');
      for (const id of logIds) s.delete(id);
    }
  });
}
