/**
 * lib/shipment/store-files.js — shipment_files / shipment_rows / upload_log
 *
 * 정책:
 *   - 같은 fileHash는 중복 차단 (DUPLICATE_HASH)
 *   - 파일 삭제 시 연결된 rows / upload_log 모두 원자적 삭제
 */

import { getAll, getByIndex, runTransaction, hasStore, checkUploadHash, deleteFileWithLog } from '../db';

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
  return checkUploadHash(fileHash, 'shipment');
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

/** shipment_files 단건 삭제 + 연결된 shipment_rows / upload_log 모두 삭제. */
export async function deleteShipmentFile(fileId) {
  return deleteFileWithLog('shipment_files', 'shipment_rows', fileId, 'shipment');
}
