import { hasStore, getByIndex, runTransaction } from './crud';

export async function checkUploadHash(fileHash, module) {
  if (!hasStore('upload_log') || !fileHash) return false;
  const logs = await getByIndex('upload_log', 'fileHash', fileHash);
  return logs.some(l => l.module === module);
}

/**
 * 파일 레코드 + 연결된 행 레코드 + upload_log 일괄 원자 삭제.
 * price / shipment / sales 모듈이 공유하는 패턴.
 *
 * @param {string} fileStore — 'price_files' | 'shipment_files' | 'sales_files'
 * @param {string} rowStore  — 'price_rows'  | 'shipment_rows'  | 'sales_rows'
 * @param {number} fileId
 * @param {string} [module]  — 'price' | 'shipment' | 'sales'
 */
export async function deleteFileWithLog(fileStore, rowStore, fileId, module) {
  const rowIds = hasStore(rowStore)
    ? (await getByIndex(rowStore, 'fileId', fileId)).map(r => r.id)
    : [];
  const logIds = hasStore('upload_log')
    ? (await getByIndex('upload_log', 'linkedFileId', fileId))
        .filter(l => !module || l.module === module)
        .map(l => l.id)
    : [];

  const stores = [];
  if (hasStore(fileStore)) stores.push(fileStore);
  if (hasStore(rowStore)) stores.push(rowStore);
  if (hasStore('upload_log')) stores.push('upload_log');

  await runTransaction(stores, 'readwrite', tx => {
    if (hasStore(fileStore)) tx.objectStore(fileStore).delete(fileId);
    if (rowIds.length > 0) {
      const rowStoreObj = tx.objectStore(rowStore);
      for (const id of rowIds) rowStoreObj.delete(id);
    }
    if (logIds.length > 0) {
      const logStoreObj = tx.objectStore('upload_log');
      for (const id of logIds) logStoreObj.delete(id);
    }
  });
}
