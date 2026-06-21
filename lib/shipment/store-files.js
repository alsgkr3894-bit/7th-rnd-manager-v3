/**
 * lib/shipment/store-files.js — shipment_files / shipment_rows / upload_log
 *
 * 정책:
 *   - 같은 fileHash는 중복 차단 (DUPLICATE_HASH)
 *   - 파일 삭제 시 연결된 rows / upload_log 모두 원자적 삭제
 */

import {
  getAll,
  getByIndex,
  runTransaction,
  hasStore,
  checkUploadHash,
  deleteFileWithLog,
} from '../db';
import { asDisplayText, asFiniteNumber, asObjectArray } from '../ui/prop-guards.js';

/** 모든 shipment_files (최신순) */
export async function getShipmentFiles() {
  if (!hasStore('shipment_files')) return [];
  const files = asObjectArray(await getAll('shipment_files'));
  return files.sort((a, b) => {
    const ay = asFiniteNumber(a.year, 0) ?? 0;
    const by = asFiniteNumber(b.year, 0) ?? 0;
    const am = asFiniteNumber(a.month, 0) ?? 0;
    const bm = asFiniteNumber(b.month, 0) ?? 0;
    if (ay !== by) return by - ay;
    if (am !== bm) return bm - am;
    return asDisplayText(b.uploadedAt).localeCompare(asDisplayText(a.uploadedAt));
  });
}

/** fileId에 연결된 shipment_rows */
export async function getShipmentRowsByFileId(fileId) {
  if (!hasStore('shipment_rows')) return [];
  if (fileId == null) return [];
  return asObjectArray(await getByIndex('shipment_rows', 'fileId', fileId));
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
  // 빠른 사전 차단. 트랜잭션 밖이라 멀티탭/연속클릭 race는 아래 트랜잭션 내 재확인이
  // 최종 권위를 가진다.
  if (await checkHashExists(log.fileHash)) throw new Error('DUPLICATE_HASH');

  const fileHash = log?.fileHash;
  let fileId;
  let duplicate = false;
  try {
    await runTransaction(['shipment_files', 'shipment_rows', 'upload_log'], 'readwrite', tx => {
      const saveAll = () => {
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
      };
      // fileHash가 없으면 중복 개념이 없으므로(기존 checkHashExists와 동일) 바로 저장.
      if (!fileHash) {
        saveAll();
        return;
      }
      // 같은 트랜잭션 안에서 같은 fileHash(module=shipment) 재확인 — TOCTOU race 차단.
      const dupReq = tx.objectStore('upload_log').index('fileHash').getAll(fileHash);
      dupReq.onsuccess = () => {
        if (dupReq.result.some(l => l.module === 'shipment')) {
          duplicate = true;
          tx.abort();
          return;
        }
        saveAll();
      };
    });
  } catch (err) {
    if (duplicate) throw new Error('DUPLICATE_HASH');
    throw err;
  }
  return fileId;
}

/** shipment_files 단건 삭제 + 연결된 shipment_rows / upload_log 모두 삭제. */
export async function deleteShipmentFile(fileId) {
  return deleteFileWithLog('shipment_files', 'shipment_rows', fileId, 'shipment');
}
