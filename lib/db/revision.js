/**
 * lib/db/revision.js — 저장소별 변경 번호.
 *
 * 앱의 모든 쓰기는 열린 DB의 transaction()을 거친다(lib/db/init.js가 연결할 때 감싼다).
 * 쓰기가 시작되고 끝날 때마다 번호를 올리고 다른 탭에도 알린다. 번호가 같으면 그 저장소의
 * 내용이 그대로라, 전체 조회를 다시 하지 않아도 된다(lib/db/read-cache.js).
 */
const CHANNEL_NAME = 'rnd-store-revision';

const revisions = new Map();
const writing = new Map();
const tracked = new WeakSet();
const listeners = new Set();
let channel;

const keyOf = (dbName, storeName) => `${dbName}/${storeName}`;

function bump(dbName, stores) {
  for (const store of stores) {
    const key = keyOf(dbName, store);
    revisions.set(key, (revisions.get(key) || 0) + 1);
  }
}

function notify(dbName, stores) {
  for (const listener of listeners) {
    try {
      listener({ dbName, stores });
    } catch (error) {
      console.warn('[DB] 변경 알림 처리 실패:', error?.message || String(error));
    }
  }
}

function ensureChannel() {
  if (channel !== undefined) return channel;
  channel = null;
  if (typeof BroadcastChannel !== 'function') return channel;
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = event => {
    const { dbName, stores } = event?.data || {};
    if (!dbName || !Array.isArray(stores)) return;
    bump(dbName, stores);
    notify(dbName, stores);
  };
  // Node(테스트)에서 열린 채널이 프로세스를 붙잡지 않게
  channel.unref?.();
  return channel;
}

export function revisionOf(dbName, storeName) {
  return revisions.get(keyOf(dbName, storeName)) || 0;
}

export function isBeingWritten(dbName, storeName) {
  return (writing.get(keyOf(dbName, storeName)) || 0) > 0;
}

/** 이 연결은 쓰기를 모두 추적한다 — 조회 결과를 보관해도 된다. */
export function isTrackedDatabase(db) {
  return tracked.has(db);
}

/** 쓰기가 끝날 때(이 탭·다른 탭) 알림을 받는다. 반환 함수로 해제한다. */
export function onStoresChanged(listener) {
  ensureChannel();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function begin(dbName, stores) {
  bump(dbName, stores);
  for (const store of stores) {
    const key = keyOf(dbName, store);
    writing.set(key, (writing.get(key) || 0) + 1);
  }
}

function finish(dbName, stores) {
  for (const store of stores) {
    const key = keyOf(dbName, store);
    writing.set(key, Math.max(0, (writing.get(key) || 0) - 1));
  }
  bump(dbName, stores);
  notify(dbName, stores);
  try {
    ensureChannel()?.postMessage({ dbName, stores });
  } catch (error) {
    console.warn('[DB] 다른 탭 변경 알림 실패:', error?.message || String(error));
  }
}

/** 연결의 transaction()을 감싸 쓰기 시작·끝을 기록한다. */
export function trackWrites(db, dbName) {
  if (!db || typeof db.transaction !== 'function' || tracked.has(db)) return db;
  const original = db.transaction.bind(db);
  db.transaction = (storeNames, mode, options) => {
    const tx = original(storeNames, mode, options);
    if (mode === 'readwrite') {
      const stores = typeof storeNames === 'string' ? [storeNames] : Array.from(storeNames);
      begin(dbName, stores);
      const done = () => finish(dbName, stores);
      tx.addEventListener('complete', done, { once: true });
      tx.addEventListener('abort', done, { once: true });
    }
    return tx;
  };
  tracked.add(db);
  ensureChannel();
  return db;
}
