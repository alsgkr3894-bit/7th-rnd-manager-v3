/**
 * lib/db/operations.js — IndexedDB CRUD 공통 함수
 *
 * v2 src/core/db.js의 getAll, getById, getByIndex, put, bulkPut,
 * deleteById, runTransaction, clearStore, deleteWithChildren,
 * exportAll, importAll 부분 이식.
 *
 * 모든 함수는 클라이언트 전용 (initDB() 먼저 호출 필요).
 */

import { ALL_STORES } from './constants';
import { _getDB } from './init';
import { collectLocalStorage, restoreLocalStorage } from '@/lib/nutrition/backup-keys';

/**
 * DB에 store가 실제 존재하는지 확인.
 * schema에 정의되어 있어도 사용자 브라우저의 DB가 옛 버전일 수 있음.
 */
export function hasStore(storeName) {
  try {
    const db = _getDB();
    return db.objectStoreNames.contains(storeName);
  } catch {
    return false;
  }
}

/**
 * DB를 완전 삭제 (사용자 브라우저의 옛 schema 정리용).
 * 호출 후 페이지 새로고침해야 새 schema로 DB 생성됨.
 *
 * 주의: 모든 데이터 삭제. 호출 전 백업 권장.
 *
 * @returns {Promise<void>}
 */
export function deleteDatabase(dbName) {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }
    // 현재 연결된 DB 먼저 close
    try {
      const db = _getDB();
      db.close();
    } catch {}

    const req = indexedDB.deleteDatabase(dbName);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
    req.onblocked = () => reject(new Error('다른 탭에서 DB가 열려있어 삭제할 수 없습니다. 다른 탭을 닫고 다시 시도하세요.'));
  });
}

/**
 * store 전체 조회. 1초 넘게 걸리면 콘솔 경고.
 * @param {string} storeName
 * @returns {Promise<any[]>}
 */
export function getAll(storeName) {
  const t0 = performance.now();
  return new Promise((resolve, reject) => {
    const tx = _getDB().transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => {
      const ms = Math.round(performance.now() - t0);
      if (ms > 1000) {
        console.warn(`[DB] getAll('${storeName}') ${ms}ms — 데이터 ${req.result.length}건`);
      }
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * @param {string} storeName
 * @param {IDBValidKey} id
 * @returns {Promise<any|undefined>}
 */
export function getById(storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = _getDB().transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * @param {string} storeName
 * @param {string} indexName
 * @param {IDBValidKey} value
 * @returns {Promise<any[]>}
 */
export function getByIndex(storeName, indexName, value) {
  return new Promise((resolve, reject) => {
    const tx = _getDB().transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).index(indexName).getAll(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * @param {string} storeName
 * @param {object} data - 저장할 레코드 (keyPath 포함)
 * @returns {Promise<IDBValidKey>} 저장된 키
 */
export function put(storeName, data) {
  return new Promise((resolve, reject) => {
    const tx = _getDB().transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).put(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * @param {string} storeName
 * @param {object[]} dataList - 저장할 레코드 배열 (500건 초과 시 청크 분할)
 * @returns {Promise<number>} 저장된 레코드 수
 */
export function bulkPut(storeName, dataList) {
  if (!dataList || dataList.length === 0) return Promise.resolve(0);

  // Large imports: split into chunks of 500 to avoid transaction timeout
  if (dataList.length > 500) {
    const CHUNK = 500;
    const chunks = [];
    for (let i = 0; i < dataList.length; i += CHUNK) {
      chunks.push(dataList.slice(i, i + CHUNK));
    }
    return chunks.reduce(
      (chain, chunk) => chain.then(() => bulkPut(storeName, chunk)),
      Promise.resolve(0)
    ).then(() => dataList.length);
  }

  return new Promise((resolve, reject) => {
    const tx = _getDB().transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    dataList.forEach(item => store.put(item));
    tx.oncomplete = () => resolve(dataList.length);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * 삭제된 레코드를 원래 id 그대로 복원한다 (삭제 Undo용).
 * autoIncrement store에서도 id를 명시하면 put이 upsert로 동작하므로 동일 키로 복원된다.
 *
 * @param {string} storeName
 * @param {object} record - id 포함된 원본 레코드
 * @returns {Promise<IDBValidKey>}
 */
export function restoreRecord(storeName, record) {
  return put(storeName, record);
}

/**
 * @param {string} storeName
 * @param {IDBValidKey} id
 * @returns {Promise<void>}
 */
export function deleteById(storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = _getDB().transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * 여러 store를 단일 트랜잭션으로 처리하는 헬퍼.
 *
 * work(tx)는 동기적으로 IDBRequest를 등록해야 함 (await 금지 — tx 자동 종료).
 * work에서 throw 시 tx.abort() 호출.
 * 트랜잭션이 oncomplete에 도달해야만 resolve.
 *
 * @param {string|string[]} storeNames
 * @param {'readonly'|'readwrite'} mode
 * @param {(tx: IDBTransaction) => any} work
 * @returns {Promise<any>}
 */
export function runTransaction(storeNames, mode, work) {
  return new Promise((resolve, reject) => {
    const tx = _getDB().transaction(storeNames, mode);
    let result;
    let workError = null;
    try {
      result = work(tx);
    } catch (err) {
      workError = err;
      try { tx.abort(); } catch {}
    }
    tx.oncomplete = () => resolve(result);
    tx.onerror    = () => reject(workError || tx.error || new Error('Transaction error'));
    tx.onabort    = () => reject(workError || tx.error || new Error('Transaction aborted'));
  });
}

/**
 * @param {string} storeName
 * @returns {Promise<void>}
 */
export function clearStore(storeName) {
  return new Promise((resolve, reject) => {
    const tx = _getDB().transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * store를 비우고 새 레코드로 교체.
 *
 * 소규모(≤500건): clear + put을 단일 트랜잭션 → 완전 원자성.
 * 대규모(>500건): clear 트랜잭션 → 500건씩 청크 트랜잭션 순차 실행.
 *   단일 트랜잭션에 수만 건을 몰아넣으면 IndexedDB 트랜잭션이 멈추는
 *   브라우저 한계를 회피. 복원 직전 autoBackup이 보호하므로 원자성 완화는 안전.
 *
 * @param {string} storeName
 * @param {object[]} rows
 * @returns {Promise<number>} 저장된 레코드 수
 */
export async function replaceStore(storeName, rows) {
  const valid = Array.isArray(rows)
    ? rows.filter(r => r !== null && typeof r === 'object')
    : [];

  const CHUNK = 500;

  if (valid.length <= CHUNK) {
    // 소규모: 단일 원자 트랜잭션
    return new Promise((resolve, reject) => {
      const tx = _getDB().transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.clear();
      valid.forEach(item => store.put(item));
      tx.oncomplete = () => resolve(valid.length);
      tx.onerror    = () => reject(tx.error);
      tx.onabort    = () => reject(tx.error || new Error(`replaceStore aborted: ${storeName}`));
    });
  }

  // 대규모: clear → 청크별 쓰기
  await new Promise((resolve, reject) => {
    const tx = _getDB().transaction(storeName, 'readwrite');
    tx.objectStore(storeName).clear();
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
    tx.onabort    = () => reject(tx.error || new Error(`replaceStore clear aborted: ${storeName}`));
  });

  for (let i = 0; i < valid.length; i += CHUNK) {
    const chunk = valid.slice(i, i + CHUNK);
    await new Promise((resolve, reject) => {
      const tx = _getDB().transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      chunk.forEach(item => store.put(item));
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
      tx.onabort    = () => reject(tx.error || new Error(`replaceStore chunk aborted: ${storeName}`));
    });
  }

  return valid.length;
}

/**
 * 부모 레코드 삭제 시 인덱스로 연결된 자식 레코드도 함께 삭제 (트랜잭션 원자성 보장).
 *
 * 1단계: 자식 ID 수집 (readonly, await 가능)
 * 2단계: 단일 readwrite 트랜잭션에서 부모 + 자식 모두 삭제 (await 없음, 원자성)
 *
 * @param {string} parentStore
 * @param {number} parentId
 * @param {Array<{childStore: string, indexName: string}>} childSpecs
 */
export async function deleteWithChildren(parentStore, parentId, childSpecs) {
  const childIds = {};
  if (Array.isArray(childSpecs)) {
    for (const spec of childSpecs) {
      const children = await getByIndex(spec.childStore, spec.indexName, parentId);
      childIds[spec.childStore] = children.map(c => c.id);
    }
  }

  const storeNames = [parentStore, ...Object.keys(childIds)];
  return runTransaction(storeNames, 'readwrite', (tx) => {
    tx.objectStore(parentStore).delete(parentId);
    for (const [storeName, ids] of Object.entries(childIds)) {
      const store = tx.objectStore(storeName);
      for (const id of ids) store.delete(id);
    }
  });
}

/**
 * upload_log에서 모듈별 해시 중복 확인.
 * price / shipment 두 스토어가 공유하는 패턴.
 *
 * @param {string|undefined} fileHash
 * @param {'price'|'shipment'} module
 */
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
 * @param {string} [module]  — 'price' | 'shipment' | 'sales'. 지정 시 upload_log를
 *   linkedFileId + module 양쪽 조건으로 필터링 — 다른 모듈의 id=1 로그 교차 삭제 방지.
 */
export async function deleteFileWithLog(fileStore, rowStore, fileId, module) {
  const rowIds = hasStore(rowStore)
    ? (await getByIndex(rowStore, 'fileId', fileId)).map(r => r.id)
    : [];
  // upload_log: linkedFileId 기준 조회 후 module 필터로 교차 삭제 방지
  // (price/shipment/sales가 autoIncrement로 같은 fileId를 가질 수 있음)
  const logIds = hasStore('upload_log')
    ? (await getByIndex('upload_log', 'linkedFileId', fileId))
        .filter(l => !module || l.module === module)
        .map(l => l.id)
    : [];

  const stores = [];
  if (hasStore(fileStore))    stores.push(fileStore);
  if (hasStore(rowStore))     stores.push(rowStore);
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

/**
 * 전체 데이터 백업 (JSON으로 export).
 * v2 데이터를 v3로 가져올 때도 사용.
 */
export async function exportAll() {
  return exportSelected(ALL_STORES, { scopes: 'all' });
}

/**
 * 선택된 store만 export (모듈별 부분 백업).
 *
 * DB에 실제 존재하지 않는 store는 조용히 skip (schema 업그레이드 누락 대비).
 *
 * @param {string[]} storeNames - 백업할 store 이름 배열
 * @param {object} [meta] - 결과 객체에 함께 저장할 메타 (예: scopes)
 * @param {{ onProgress?: (info: { store: string, index: number, total: number }) => void }} [options]
 * @returns {Promise<{version, exportedAt, stores, ...meta}>}
 */
export async function exportSelected(storeNames, meta = {}, options = {}) {
  const db = _getDB();
  const dbStoreNames = new Set(Array.from(db.objectStoreNames));

  const stores = {};
  const total = Math.max(storeNames.length, 1);
  let index = 0;
  const markProgress = (store) => {
    index += 1;
    options?.onProgress?.({ store, index, total });
  };

  // Filter to valid/existing names first, then fetch in parallel chunks of 5
  const validNames = [];
  for (const name of storeNames) {
    if (!ALL_STORES.includes(name)) {
      console.warn(`[DB] exportSelected: 알 수 없는 store '${name}' (skip)`);
      markProgress(name);
      continue;
    }
    if (!dbStoreNames.has(name)) {
      // DB에 실제 없음 (schema 업그레이드 누락) — 빈 배열로 처리
      stores[name] = [];
      markProgress(name);
      continue;
    }
    validNames.push(name);
  }

  const CHUNK = 5;
  for (let i = 0; i < validNames.length; i += CHUNK) {
    const chunk = validNames.slice(i, i + CHUNK);
    await Promise.all(chunk.map(async name => {
      try {
        stores[name] = await getAll(name);
      } catch (err) {
        console.warn(`[DB] exportSelected: ${name} 조회 실패 (skip):`, err);
        stores[name] = [];
      } finally {
        markProgress(name);
      }
    }));
  }

  // nutrition 스토어가 포함된 백업이면 영양성분 출력 설정(localStorage)도 함께 저장
  const includesNutrition = storeNames.some(n => n.startsWith('nutrition_'));
  const localStorageData = includesNutrition ? collectLocalStorage() : undefined;

  return {
    version: 'v3',
    exportedAt: new Date().toISOString(),
    stores,
    ...(localStorageData && Object.keys(localStorageData).length ? { localStorage: localStorageData } : {}),
    ...meta,
  };
}

/**
 * JSON 백업을 IndexedDB에 복원.
 * 기존 store 내용 모두 삭제 후 import.
 *
 * 전략: store별로 clear+put을 단일 트랜잭션(replaceStore)으로 묶어 원자성을 보장한다.
 * 한 store의 put이 실패해도 그 store의 clear가 롤백되므로 데이터가 비워진 채
 * 남지 않으며, 실패는 errors 배열로 호출자(UI)에 노출된다.
 *
 * @param {object} data - exportAll() 결과
 * @param {{ onProgress?: (info:{ store:string, index:number, total:number })=>void|Promise<void> }} [options]
 * @returns {Promise<{ imported: number, skipped: number, errors: Array<{store:string,error:string}> }>}
 */
export async function importAll(data, options = {}) {
  if (!data || typeof data.stores !== 'object') {
    throw new Error('잘못된 백업 파일 형식입니다.');
  }
  let imported = 0, skipped = 0;
  const errors = [];

  // 1단계: 유효한 store만 필터링
  const entries = Object.entries(data.stores).filter(([storeName]) => {
    if (!ALL_STORES.includes(storeName)) {
      console.warn(`[DB] importAll: 알 수 없는 store '${storeName}' (skip)`);
      skipped++;
      return false;
    }
    return true;
  });

  // 2단계: store별 순차 복원. 대용량 store는 replaceStore 내부에서 청크 분할.
  for (let i = 0; i < entries.length; i++) {
    const [storeName, rows] = entries[i];
    try {
      await options.onProgress?.({ store: storeName, index: i + 1, total: entries.length });
      await replaceStore(storeName, rows);
      imported++;
    } catch (err) {
      errors.push({ store: storeName, error: err?.message || String(err) });
    }
  }

  // 영양성분 출력 설정(localStorage) 복원
  if (data.localStorage) {
    try { restoreLocalStorage(data.localStorage); } catch { /* 무시 */ }
  }

  return { imported, skipped, errors };
}
