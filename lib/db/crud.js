import { _getDB, forgetHandle } from './init';
import {
  captureStoreRequest,
  queueCapturedStoreSync,
  queueStoreClear,
  queueStoreRowDelete,
  queueStoreRowUpsert,
  wrapTransactionForServerSync,
} from './server-sync';

export function hasStore(storeName) {
  try {
    const db = _getDB();
    return db.objectStoreNames.contains(storeName);
  } catch {
    return false;
  }
}

export function deleteDatabase(dbName) {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }
    // 닫힌 연결이 캐시에 남으면 이후 openNamed가 stale 핸들을 반환하므로 함께 제거
    forgetHandle(dbName);

    const req = indexedDB.deleteDatabase(dbName);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () =>
      reject(
        new Error('다른 탭에서 DB가 열려있어 삭제할 수 없습니다. 다른 탭을 닫고 다시 시도하세요.')
      );
  });
}

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
    let syncKey = null;
    let settled = false;
    const doReject = err => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    };
    req.onsuccess = () => {
      syncKey = req.result;
    };
    req.onerror = () => doReject(req.error);
    // 커밋(oncomplete)까지 기다린 뒤 resolve해야 저장공간 부족 등 커밋 시점 abort를
    // "성공"으로 잘못 보고하지 않는다.
    tx.oncomplete = () => {
      if (!settled) {
        settled = true;
        resolve(syncKey);
      }
      queueStoreRowUpsert(storeName, syncKey, data);
    };
    tx.onerror = () => doReject(tx.error || new Error('put transaction error'));
    tx.onabort = () => doReject(tx.error || new Error('put transaction aborted'));
  });
}

export function bulkPut(storeName, dataList) {
  if (!dataList || dataList.length === 0) return Promise.resolve(0);

  // 단일 트랜잭션에 모든 put 요청을 큐잉해 원자성을 보장한다.
  // (IndexedDB 트랜잭션은 요청 개수 제한이 없으며, 중간 실패 시 전체 롤백된다)
  return new Promise((resolve, reject) => {
    const tx = _getDB().transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const captures = [];
    dataList.forEach(item =>
      captureStoreRequest(captures, 'upsert', storeName, store.put(item), item)
    );
    tx.oncomplete = () => {
      resolve(dataList.length);
      queueCapturedStoreSync(captures);
    };
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('bulkPut transaction aborted'));
  });
}

export function restoreRecord(storeName, record) {
  return put(storeName, record);
}

export function deleteById(storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = _getDB().transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).delete(id);
    let settled = false;
    const doReject = err => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    };
    req.onerror = () => doReject(req.error);
    tx.oncomplete = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
      queueStoreRowDelete(storeName, id);
    };
    tx.onerror = () => doReject(tx.error || new Error('delete transaction error'));
    tx.onabort = () => doReject(tx.error || new Error('delete transaction aborted'));
  });
}

export function runTransaction(storeNames, mode, work) {
  return new Promise((resolve, reject) => {
    const tx = _getDB().transaction(storeNames, mode);
    const captures = [];
    const workTx = mode === 'readwrite' ? wrapTransactionForServerSync(tx, captures) : tx;
    let result;
    let settled = false;
    const doResolve = val => {
      if (!settled) {
        settled = true;
        resolve(val);
      }
    };
    const doReject = err => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    };
    try {
      result = work(workTx);
    } catch (err) {
      // work()가 예외를 던지면 abort를 시도하되, abort 성공 여부와 무관하게
      // 즉시 reject한다(abort 실패 시 oncomplete가 발생해 에러가 묻히는 것 방지).
      try {
        tx.abort();
      } catch {}
      doReject(err);
      return;
    }
    tx.oncomplete = () => {
      doResolve(result);
      if (mode === 'readwrite') queueCapturedStoreSync(captures);
    };
    tx.onerror = () => doReject(tx.error || new Error('Transaction error'));
    tx.onabort = () => doReject(tx.error || new Error('Transaction aborted'));
  });
}

export function clearStore(storeName) {
  return new Promise((resolve, reject) => {
    const tx = _getDB().transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).clear();
    let settled = false;
    const doReject = err => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    };
    req.onerror = () => doReject(req.error);
    tx.oncomplete = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
      queueStoreClear(storeName);
    };
    tx.onerror = () => doReject(tx.error || new Error('clear transaction error'));
    tx.onabort = () => doReject(tx.error || new Error('clear transaction aborted'));
  });
}

export function deleteWithChildren(parentStore, parentId, childSpecs) {
  const specs = Array.isArray(childSpecs) ? childSpecs : [];
  // 자식 id 조회와 부모+자식 삭제를 단일 readwrite 트랜잭션 안에서 수행해야
  // 조회~삭제 사이에 생성된 자식이 고아로 남는 경쟁을 막을 수 있다.
  const storeNames = [parentStore, ...new Set(specs.map(spec => spec.childStore))];
  return runTransaction(storeNames, 'readwrite', tx => {
    tx.objectStore(parentStore).delete(parentId);
    for (const spec of specs) {
      const store = tx.objectStore(spec.childStore);
      const req = store.index(spec.indexName).getAllKeys(parentId);
      req.onsuccess = () => {
        for (const key of req.result || []) store.delete(key);
      };
    }
  });
}
