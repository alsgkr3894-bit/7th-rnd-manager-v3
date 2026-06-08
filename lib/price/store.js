/**
 * lib/price/store.js — price_files / price_rows / upload_log
 *
 * 핵심:
 *   - 같은 updateDate 중복 차단 (DUPLICATE_DATE)
 *   - 저장 / 삭제는 원자적 트랜잭션
 *   - 해시 중복 체크는 price 모듈에서 사용하지 않음 (날짜 기준 dedup)
 */

import { getAll, getByIndex, runTransaction, hasStore, deleteFileWithLog } from '../db';
import { emitPriceUpload } from './price-events';

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

/**
 * price_files 1건 + price_rows N건 + upload_log 1건 원자적 저장.
 *
 * @param {{ meta, rows, log }} payload
 * @returns {number} fileId
 * @throws Error('DUPLICATE_DATE')
 */
export async function savePriceUpload({ meta, rows, log }) {
  if (await checkDateExists(meta.updateDate)) throw new Error('DUPLICATE_DATE');

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
  emitPriceUpload();
  return fileId;
}

/** price_files 단건 삭제 + 연결된 price_rows / upload_log 모두 함께 삭제. */
export async function deletePriceFile(fileId) {
  const result = await deleteFileWithLog('price_files', 'price_rows', fileId, 'price');
  emitPriceUpload();
  return result;
}
