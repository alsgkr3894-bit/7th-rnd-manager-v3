import { _getDB } from './init';

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
    try {
      const db = _getDB();
      db.close();
    } catch {}

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
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function bulkPut(storeName, dataList) {
  if (!dataList || dataList.length === 0) return Promise.resolve(0);

  if (dataList.length > 500) {
    const CHUNK = 500;
    const chunks = [];
    for (let i = 0; i < dataList.length; i += CHUNK) {
      chunks.push(dataList.slice(i, i + CHUNK));
    }
    return chunks
      .reduce((chain, chunk) => chain.then(() => bulkPut(storeName, chunk)), Promise.resolve(0))
      .then(() => dataList.length);
  }

  return new Promise((resolve, reject) => {
    const tx = _getDB().transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    dataList.forEach(item => store.put(item));
    tx.oncomplete = () => resolve(dataList.length);
    tx.onerror = () => reject(tx.error);
  });
}

export function restoreRecord(storeName, record) {
  return put(storeName, record);
}

export function deleteById(storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = _getDB().transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export function runTransaction(storeNames, mode, work) {
  return new Promise((resolve, reject) => {
    const tx = _getDB().transaction(storeNames, mode);
    let result;
    let workError = null;
    try {
      result = work(tx);
    } catch (err) {
      workError = err;
      try {
        tx.abort();
      } catch {}
    }
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(workError || tx.error || new Error('Transaction error'));
    tx.onabort = () => reject(workError || tx.error || new Error('Transaction aborted'));
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

export async function deleteWithChildren(parentStore, parentId, childSpecs) {
  const childIds = {};
  if (Array.isArray(childSpecs)) {
    for (const spec of childSpecs) {
      const children = await getByIndex(spec.childStore, spec.indexName, parentId);
      childIds[spec.childStore] = children.map(c => c.id);
    }
  }

  const storeNames = [parentStore, ...Object.keys(childIds)];
  return runTransaction(storeNames, 'readwrite', tx => {
    tx.objectStore(parentStore).delete(parentId);
    for (const [storeName, ids] of Object.entries(childIds)) {
      const store = tx.objectStore(storeName);
      for (const id of ids) store.delete(id);
    }
  });
}
