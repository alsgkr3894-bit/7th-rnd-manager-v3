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

export function getById(storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = _getDB().transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function getByIndex(storeName, indexName, value) {
  return new Promise((resolve, reject) => {
    const tx = _getDB().transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).index(indexName).getAll(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function put(storeName, data) {
  return new Promise((resolve, reject) => {
    const tx = _getDB().transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).put(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function bulkPut(storeName, dataList) {
  return new Promise((resolve, reject) => {
    if (!dataList || dataList.length === 0) { resolve(0); return; }
    const tx = _getDB().transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    dataList.forEach(item => store.put(item));
    tx.oncomplete = () => resolve(dataList.length);
    tx.onerror = () => reject(tx.error);
  });
}

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
    tx.onerror    = () => reject(tx.error);
    tx.onabort    = () => reject(workError || tx.error || new Error('Transaction aborted'));
  });
}

export function clearStore(storeName) {
  return new Promise((resolve, reject) => {
    const tx = _getDB().transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
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
 * 전체 데이터 백업 (JSON으로 export).
 * v2 데이터를 v3로 가져올 때도 사용.
 */
export async function exportAll() {
  return exportSelected(ALL_STORES, { scopes: 'all' });
}

/**
 * 선택된 store만 export (모듈별 부분 백업).
 *
 * @param {string[]} storeNames - 백업할 store 이름 배열
 * @param {object} [meta] - 결과 객체에 함께 저장할 메타 (예: scopes)
 * @returns {Promise<{version, exportedAt, stores, ...meta}>}
 */
export async function exportSelected(storeNames, meta = {}) {
  const stores = {};
  for (const name of storeNames) {
    if (!ALL_STORES.includes(name)) {
      console.warn(`[DB] exportSelected: 알 수 없는 store '${name}' (skip)`);
      continue;
    }
    try {
      stores[name] = await getAll(name);
    } catch (err) {
      console.warn(`[DB] exportSelected: ${name} 조회 실패 (skip):`, err);
      stores[name] = [];
    }
  }
  return {
    version: 'v3',
    exportedAt: new Date().toISOString(),
    stores,
    ...meta,
  };
}

/**
 * JSON 백업을 IndexedDB에 복원.
 * 기존 store 내용 모두 삭제 후 import.
 *
 * @param {object} data - exportAll() 결과
 */
export async function importAll(data) {
  if (!data || typeof data.stores !== 'object') {
    throw new Error('잘못된 백업 파일 형식입니다.');
  }
  for (const [storeName, rows] of Object.entries(data.stores)) {
    if (!ALL_STORES.includes(storeName)) {
      console.warn(`[DB] importAll: 알 수 없는 store '${storeName}' (skip)`);
      continue;
    }
    await clearStore(storeName);
    if (Array.isArray(rows) && rows.length > 0) {
      await bulkPut(storeName, rows);
    }
  }
}
