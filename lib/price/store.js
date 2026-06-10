/**
 * lib/price/store.js — price_files / price_rows / upload_log
 *
 * 핵심:
 *   - 같은 updateDate 중복 차단 (DUPLICATE_DATE)
 *   - 저장 / 삭제는 원자적 트랜잭션
 *   - 해시 중복 체크는 price 모듈에서 사용하지 않음 (날짜 기준 dedup)
 */

import { getAll, getByIndex, runTransaction, hasStore, deleteFileWithLog } from '../db';
import { asDisplayText, asObjectArray } from '../ui/prop-guards.js';
import { dedupePriceRowsByProductCode } from './duplicates.js';
import { emitPriceUpload } from './price-events';

/** 업데이트 날짜 내림차순 정렬된 price_files 목록 */
export async function getPriceFiles() {
  if (!hasStore('price_files')) return [];
  const files = asObjectArray(await getAll('price_files'));
  return files.sort((a, b) =>
    asDisplayText(b.updateDate).localeCompare(asDisplayText(a.updateDate))
  );
}

/** fileId에 연결된 price_rows */
export async function getPriceRowsByFileId(fileId) {
  if (!hasStore('price_rows')) return [];
  if (fileId == null) return [];
  const rows = asObjectArray(await getByIndex('price_rows', 'fileId', fileId));
  return dedupePriceRowsByProductCode(rows).rows;
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

  const { rows: rowsToSave, diagnostics } = dedupePriceRowsByProductCode(rows);
  let fileId;
  await runTransaction(['price_files', 'price_rows', 'upload_log'], 'readwrite', tx => {
    const fileReq = tx.objectStore('price_files').add({ ...meta, totalRows: rowsToSave.length });
    fileReq.onerror = () => tx.abort();
    fileReq.onsuccess = () => {
      fileId = fileReq.result;
      const rowStore = tx.objectStore('price_rows');
      for (const r of rowsToSave) {
        rowStore.add({ ...r, fileId, updateDate: meta.updateDate });
      }
      tx.objectStore('upload_log').add({
        ...log,
        totalRows: rowsToSave.length,
        duplicateCount: log?.duplicateCount ?? diagnostics.duplicateRows,
        linkedFileId: fileId,
      });
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
