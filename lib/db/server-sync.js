import { getActiveBrandId } from '@/lib/active-brand';
import { fetchAppJson } from '@/lib/session';

import { SHARED_STORE_NAMES } from './module-stores';

const FLUSH_DELAY_MS = 150;
const MAX_BATCH_SIZE = 200;
const RETRY_COOLDOWN_MS = 30000;
const CLIENT_ID_KEY = 'v3:server-store-sync-client-id';
const NON_ID_KEY_PATHS = {
  settings: 'key',
  migration_flags: 'flag',
};

let queue = [];
let flushTimer = null;
let flushPromise = null;
let disabledUntil = 0;
let hasWarned = false;
let unloadFlushInstalled = false;

function isPlainRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isBrowserSyncAvailable() {
  if (typeof window === 'undefined') return false;
  if (window.__RND_DISABLE_SERVER_STORE_SYNC__ === true) return false;
  return true;
}

function isEnabled() {
  return isBrowserSyncAvailable() && Date.now() >= disabledUntil;
}

function keyPathForStore(storeName) {
  return NON_ID_KEY_PATHS[storeName] || 'id';
}

function makeClientId() {
  const randomId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `browser:${randomId}`;
}

function getClientId() {
  if (typeof localStorage === 'undefined') return '';
  try {
    const existing = localStorage.getItem(CLIENT_ID_KEY);
    if (existing) return existing;
    const next = makeClientId();
    localStorage.setItem(CLIENT_ID_KEY, next);
    return next;
  } catch (error) {
    console.warn('[DB sync] client id unavailable:', error?.message || String(error));
    return '';
  }
}

function brandIdForStore(storeName, explicitBrandId) {
  if (SHARED_STORE_NAMES.has(storeName)) return 'main';
  if (explicitBrandId != null && explicitBrandId !== '') return explicitBrandId;
  return getActiveBrandId();
}

function recordWithResolvedKey(storeName, data, key) {
  if (!isPlainRecord(data)) return data;
  const keyPath = keyPathForStore(storeName);
  if (!keyPath || data[keyPath] != null || key == null) return data;
  return { ...data, [keyPath]: key };
}

function recordKeyFrom(key, data, storeName) {
  if (key != null) return String(key);
  const keyPath = keyPathForStore(storeName);
  if (isPlainRecord(data) && data[keyPath] != null) return String(data[keyPath]);
  if (isPlainRecord(data) && data.id != null) return String(data.id);
  return '';
}

function scheduleFlush() {
  if (flushTimer || flushPromise || !isEnabled()) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushServerStoreSyncQueue();
  }, FLUSH_DELAY_MS);
}

function scheduleRetryFlush() {
  if (flushTimer || flushPromise || queue.length === 0) return;
  const delay = Math.max(disabledUntil - Date.now(), FLUSH_DELAY_MS);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushServerStoreSyncQueue();
  }, delay);
}

// 페이지 언로드/브랜드 전환 직전의 잔여 큐를 sendBeacon으로 최대한 서버에 전달한다.
// 디바운스(150ms)·재시도 대기(30s) 구간에 탭이 닫히면 메모리 큐가 통째로 유실되던 문제를 완화.
function flushViaBeacon() {
  if (queue.length === 0) return;
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') return;
  const operations = queue.splice(0, queue.length);
  try {
    const blob = new Blob([JSON.stringify({ operations })], { type: 'application/json' });
    const ok = navigator.sendBeacon('/api/db/store-rows', blob);
    if (!ok) queue = [...operations, ...queue];
  } catch {
    queue = [...operations, ...queue];
  }
}

function installUnloadFlush() {
  if (unloadFlushInstalled || typeof window === 'undefined') return;
  unloadFlushInstalled = true;
  const handler = () => flushViaBeacon();
  window.addEventListener('pagehide', handler);
  window.addEventListener('beforeunload', handler);
}

function enqueue(operation) {
  if (!isBrowserSyncAvailable()) return;
  installUnloadFlush();
  queue.push(operation);
  if (isEnabled()) scheduleFlush();
  else scheduleRetryFlush();
}

function clientIdForOptions(options = {}) {
  return options.includeClientId === false ? '' : getClientId();
}

export function queueStoreRowUpsert(storeName, key, data, options = {}) {
  if (!isPlainRecord(data)) return;
  const resolvedData = recordWithResolvedKey(storeName, data, key);
  const recordKey = recordKeyFrom(key, resolvedData, storeName);
  if (!recordKey) return;

  enqueue({
    type: 'upsert',
    clientId: clientIdForOptions(options),
    brandId: brandIdForStore(storeName, options.brandId),
    storeName,
    recordKey,
    legacyNumericId: Number.isInteger(resolvedData.id) ? resolvedData.id : null,
    data: resolvedData,
  });
}

export function queueStoreRowDelete(storeName, key, options = {}) {
  const recordKey = recordKeyFrom(key, null, storeName);
  if (!recordKey) return;
  enqueue({
    type: 'delete',
    clientId: clientIdForOptions(options),
    brandId: brandIdForStore(storeName, options.brandId),
    storeName,
    recordKey,
  });
}

export function queueStoreClear(storeName, options = {}) {
  enqueue({
    type: 'clear',
    clientId: clientIdForOptions(options),
    brandId: brandIdForStore(storeName, options.brandId),
    storeName,
  });
}

export function captureStoreRequest(captures, type, storeName, request, dataOrKey) {
  const capture = () => {
    if (type === 'upsert') {
      captures.push({
        type,
        storeName,
        key: request?.result,
        data: dataOrKey,
      });
      return;
    }
    if (type === 'delete') {
      captures.push({ type, storeName, key: dataOrKey });
      return;
    }
    captures.push({ type, storeName });
  };

  if (request && typeof request.addEventListener === 'function') {
    request.addEventListener('success', capture, { once: true });
  } else {
    capture();
  }

  return request;
}

export function queueCapturedStoreSync(captures, options = {}) {
  for (const capture of captures) {
    if (capture.type === 'upsert') {
      queueStoreRowUpsert(capture.storeName, capture.key, capture.data, options);
    } else if (capture.type === 'delete') {
      queueStoreRowDelete(capture.storeName, capture.key, options);
    } else if (capture.type === 'clear') {
      queueStoreClear(capture.storeName, options);
    }
  }
}

export function wrapObjectStoreForServerSync(storeName, store, captures) {
  return new Proxy(store, {
    get(target, prop) {
      if (prop === 'put' || prop === 'add') {
        return data => captureStoreRequest(captures, 'upsert', storeName, target[prop](data), data);
      }
      if (prop === 'delete') {
        return key => captureStoreRequest(captures, 'delete', storeName, target.delete(key), key);
      }
      if (prop === 'clear') {
        return () => captureStoreRequest(captures, 'clear', storeName, target.clear());
      }

      const value = target[prop];
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

export function wrapTransactionForServerSync(tx, captures) {
  const stores = new Map();
  return new Proxy(tx, {
    get(target, prop) {
      if (prop === 'objectStore') {
        return storeName => {
          if (!stores.has(storeName)) {
            stores.set(
              storeName,
              wrapObjectStoreForServerSync(storeName, target.objectStore(storeName), captures)
            );
          }
          return stores.get(storeName);
        };
      }

      const value = target[prop];
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

export async function flushServerStoreSyncQueue() {
  if (flushPromise) return flushPromise;
  if (!isEnabled() || queue.length === 0) return null;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  const operations = queue.splice(0, MAX_BATCH_SIZE);
  flushPromise = fetchAppJson('/api/db/store-rows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operations }),
  })
    .catch(error => {
      queue = [...operations, ...queue];
      disabledUntil = Date.now() + RETRY_COOLDOWN_MS;
      if (!hasWarned) {
        hasWarned = true;
        console.warn('[DB sync] server store sync failed:', error?.message || String(error));
      }
      return { ok: false, error };
    })
    .finally(() => {
      flushPromise = null;
      if (queue.length > 0) {
        if (isEnabled()) scheduleFlush();
        else scheduleRetryFlush();
      }
    });

  return flushPromise;
}

export async function drainServerStoreSyncQueue() {
  while (queue.length > 0 && isEnabled()) {
    const result = await flushServerStoreSyncQueue();
    if (result?.ok === false) {
      throw result.error || new Error('Server DB sync failed.');
    }
  }
  if (queue.length > 0) {
    throw new Error('Server DB sync is deferred because the API is unavailable.');
  }
}
