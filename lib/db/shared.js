/**
 * lib/db/shared.js — 브랜드 공유 데이터(노트 패밀리)용 DB 접근자
 *
 * 노트·샘플·일정·작업로그는 브랜드와 무관하게 **항상 main DB(rnd_manager_v3)**에
 * 저장/조회된다. 활성 브랜드가 무엇이든 이 헬퍼들은 main DB 핸들을 사용한다.
 *
 * operations.js의 활성-브랜드용 헬퍼와 동일 시그니처를 제공하되,
 * 호출 전 main DB가 열려 있도록 ensure-open한다(노트 페이지가 initDB로
 * 활성 브랜드 DB만 열어두는 경우에도 안전).
 */
import { dbNameFor } from './constants';
import { openNamed, getNamed } from './init';
import {
  queueCapturedStoreSync,
  queueStoreRowDelete,
  queueStoreRowUpsert,
  wrapTransactionForServerSync,
} from './server-sync';

const MAIN = dbNameFor('main');

/** main DB가 열려 있도록 보장 (캐시됨). */
export function initSharedDB() {
  return openNamed(MAIN);
}

function db() {
  return getNamed(MAIN);
}

export function sharedHasStore(storeName) {
  try {
    return db().objectStoreNames.contains(storeName);
  } catch {
    return false;
  }
}

export async function sharedGetAll(storeName) {
  await openNamed(MAIN);
  return new Promise((resolve, reject) => {
    const tx = db().transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function sharedGetById(storeName, id) {
  await openNamed(MAIN);
  return new Promise((resolve, reject) => {
    const tx = db().transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function sharedGetByIndex(storeName, indexName, value) {
  await openNamed(MAIN);
  return new Promise((resolve, reject) => {
    const tx = db().transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).index(indexName).getAll(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function sharedPut(storeName, data) {
  await openNamed(MAIN);
  return new Promise((resolve, reject) => {
    const tx = db().transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).put(data);
    let syncKey = null;
    req.onsuccess = () => {
      syncKey = req.result;
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => queueStoreRowUpsert(storeName, syncKey, data);
  });
}

/** 삭제된 노트/샘플 레코드 복원(Undo) — id 그대로 put. */
export const sharedRestoreRecord = (storeName, record) => sharedPut(storeName, record);

export async function sharedDeleteById(storeName, id) {
  await openNamed(MAIN);
  return new Promise((resolve, reject) => {
    const tx = db().transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => queueStoreRowDelete(storeName, id);
  });
}

/**
 * 노트 패밀리 멀티-store 트랜잭션. work(tx)는 동기적으로 request 등록.
 */
export async function sharedRunTransaction(storeNames, mode, work) {
  await openNamed(MAIN);
  return new Promise((resolve, reject) => {
    const tx = db().transaction(storeNames, mode);
    const captures = [];
    const workTx = mode === 'readwrite' ? wrapTransactionForServerSync(tx, captures) : tx;
    let result;
    try {
      result = work(workTx);
    } catch (err) {
      try {
        tx.abort();
      } catch {}
      reject(err);
      return;
    }
    tx.oncomplete = () => {
      resolve(result);
      if (mode === 'readwrite') queueCapturedStoreSync(captures);
    };
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('transaction aborted'));
  });
}
