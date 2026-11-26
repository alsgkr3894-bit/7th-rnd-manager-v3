/**
 * lib/db/read-cache.js — 변경이 없는 저장소는 전체 조회를 다시 하지 않는다.
 *
 * 화면을 옮길 때마다 식자재·메뉴·레시피·단가를 처음부터 다시 읽던 것이 가장 큰 지연이었다.
 * 변경 번호(revision.js)가 같으면 보관한 결과의 사본을 돌려준다. 호출부가 받은 값을 고쳐도
 * 보관본은 그대로다(객체·배열은 복사, 문자열은 바뀌지 않으므로 공유).
 */
import { isBeingWritten, isTrackedDatabase, revisionOf } from './revision';
import { noteReadDuration } from './slow-read';

// 보관하지 않는 저장소: 행이 아주 많거나, 사진이 대부분이라 붙잡아 두면 메모리가 크게 는다
export const UNCACHED_STORES = new Set([
  'shipment_rows',
  'menu_dev_notes',
  'sample_records',
  'market_research',
]);
export const MAX_CACHED_ROWS = 20000;

const pendingByDb = new WeakMap();
const cacheByDb = new WeakMap();

function mapFor(owner, db) {
  let map = owner.get(db);
  if (!map) {
    map = new Map();
    owner.set(db, map);
  }
  return map;
}

export function copyRows(value) {
  if (Array.isArray(value)) return value.map(copyRows);
  if (value === null || typeof value !== 'object') return value;
  const prototype = Object.getPrototypeOf(value);
  // 날짜·Blob 같은 값은 그대로 둔다
  if (prototype !== Object.prototype && prototype !== null) return value;
  const copy = {};
  for (const key in value) copy[key] = copyRows(value[key]);
  return copy;
}

/** 호출부마다 따로 고칠 수 있는 사본. 행이 아주 많은 저장소는 복사 비용이 커서 그대로 넘긴다. */
const ownRows = rows => (rows.length > MAX_CACHED_ROWS ? rows : copyRows(rows));

/** 같은 저장소(같은 변경 번호)를 동시에 요청하면 IndexedDB 요청을 하나만 실행한다. */
function readOnce(db, storeName, revision) {
  const pending = mapFor(pendingByDb, db);
  const key = `${storeName}@${revision}`;
  const running = pending.get(key);
  if (running) return running;

  const startedAt = performance.now();
  const request = new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => {
      noteReadDuration(storeName, Math.round(performance.now() - startedAt), req.result.length);
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
  });
  pending.set(key, request);
  // finally()는 실패를 이어받은 새 Promise를 만들어, 호출부가 처리해도 "처리되지 않은 거부"가 남는다
  const forget = () => {
    if (pending.get(key) === request) pending.delete(key);
  };
  request.then(forget, forget);
  return request;
}

export function readAllRows(db, storeName) {
  if (!isTrackedDatabase(db) || UNCACHED_STORES.has(storeName)) {
    return readOnce(db, storeName, revisionOf(db.name, storeName)).then(ownRows);
  }
  const revision = revisionOf(db.name, storeName);
  // 쓰는 중인 저장소는 보관하지도, 보관본을 쓰지도 않는다
  if (isBeingWritten(db.name, storeName)) {
    return readOnce(db, storeName, revision).then(ownRows);
  }
  const cache = mapFor(cacheByDb, db);
  const kept = cache.get(storeName);
  if (kept && kept.revision === revision) return kept.rows.then(ownRows);

  const rows = readOnce(db, storeName, revision);
  const entry = { revision, rows };
  cache.set(storeName, entry);
  const drop = () => {
    if (cache.get(storeName) === entry) cache.delete(storeName);
  };
  rows.then(result => {
    if (result.length > MAX_CACHED_ROWS) drop();
  }, drop);
  return rows.then(ownRows);
}
