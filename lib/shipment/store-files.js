/**
 * lib/shipment/store-files.js — shipment_files / shipment_rows / upload_log
 *
 * 정책:
 *   - 같은 fileHash는 중복 차단 (DUPLICATE_HASH)
 *   - 파일 삭제 시 연결된 rows / upload_log 모두 원자적 삭제
 */

import { getAll, getByIndex, runTransaction, hasStore } from '../db';

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
