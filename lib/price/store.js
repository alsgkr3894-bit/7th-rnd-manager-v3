/**
 * lib/price/store.js — price_files / price_rows / upload_log
 *
 * 핵심:
 *   - 같은 updateDate 중복 차단 (DUPLICATE_DATE)
 *   - 같은 fileHash 중복 차단 (DUPLICATE_HASH)
 *   - 저장 / 삭제는 원자적 트랜잭션
 */

import { getAll, getByIndex, runTransaction, hasStore } from '../db';

/** 업데이트 날짜 내림차순 정렬된 price_files 목록 */
export async function getPriceFiles() {
  if (!hasStore('price_files')) return [];
  const files = await getAll('price_files');
  return files.sort((a, b) => (b.updateDate || '').localeCompare(a.updateDate || ''));
}

/** fileId에 연결된 price_rows */
export async function getPriceRowsByFileId(fileId) {
  if (!hasStore('price_rows')) return [];
  return getByIndex('price_rows', 'fileId', fileId);
}

/** 같은 updateDate가 이미 있는지 */
export async function checkDateExists(updateDate) {
  if (!hasStore('price_files')) return false;
  const files = await getAll('price_files');
  return files.some(f => f.updateDate === updateDate);
}

/** 같은 fileHash가 upload_log에 있는지 (module=price) */
export async function checkHashExists(fileHash) {
  if (!hasStore('upload_log') || !fileHash) return false;
  const logs = await getByIndex('upload_log', 'fileHash', fileHash);
  return logs.some(l => l.module === 'price');
}

/**
 * price_files 1건 + price_rows N건 + upload_log 1건 원자적 저장.
 *
 * @param {{ meta, rows, log }} payload
 * @returns {number} fileId
 * @throws Error('DUPLICATE_DATE'|'DUPLICATE_HASH')
 */
export async function savePriceUpload({ meta, rows, log }) {
  if (await checkDateExists(meta.updateDate)) throw new Error('DUPLICATE_DATE');
  if (await checkHashExists(log.fileHash))     throw new Error('DUPLICATE_HASH');

  let fileId;
  await runTransaction(['price_files', 'price_rows', 'upload_log'], 'readwrite', (tx) => {
    const fileReq = tx.objectStore('price_files').add(meta);
    fileReq.onerror = () => tx.abort();
    fileReq.onsuccess = () => {
      fileId = fileReq.result;
      const rowStore = tx.objectStore('price_rows');
      for (const r of rows) {
        rowStore.add({ ...r, fileId, updateDate: meta.updateDate });
      }
      tx.objectStore('upload_log').add({ ...log, linkedFileId: fileId });
    };
  });
  return fileId;
}

/**
 * price_files 단건 삭제 + 연결된 price_rows / upload_log 모두 함께 삭제.
 */
export async function deletePriceFile(fileId) {
  const rowIds = hasStore('price_rows')
    ? (await getByIndex('price_rows', 'fileId', fileId)).map(r => r.id)
    : [];
  const logIds = hasStore('upload_log')
    ? (await getAll('upload_log')).filter(l => l.linkedFileId === fileId).map(l => l.id)
    : [];

  const stores = [];
  if (hasStore('price_files'))  stores.push('price_files');
  if (hasStore('price_rows'))   stores.push('price_rows');
  if (hasStore('upload_log'))   stores.push('upload_log');

  await runTransaction(stores, 'readwrite', tx => {
    if (hasStore('price_files'))   tx.objectStore('price_files').delete(fileId);
    if (rowIds.length > 0) {
      const s = tx.objectStore('price_rows');
      for (const id of rowIds) s.delete(id);
    }
    if (logIds.length > 0) {
      const s = tx.objectStore('upload_log');
      for (const id of logIds) s.delete(id);
    }
  });
}
