import { getActiveBrandId } from '@/lib/active-brand';
import { fetchAppJson } from '@/lib/session';

import { SHARED_STORE_NAMES } from './module-stores';
import { isAuthoritativeClient } from './sync-mode';

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
// 서버가 영구 거절(4xx)한 작업. 큐 앞에 그대로 되돌리면 그 뒤의 모든 저장이 영원히 막히는
// "독약 알약"이 되므로 여기로 빼내고 나머지는 계속 흘려보낸다. 설정 화면에서 보여준다.
let deadLetters = [];
const MAX_DEAD_LETTERS = 200;

function isPermanentRejection(error) {
  const status = Number(error?.status);
  return Number.isFinite(status) && status >= 400 && status < 500;
}

function parkDeadLetter(operation, error) {
  deadLetters.push({
    at: new Date().toISOString(),
    type: operation.type,
    storeName: operation.storeName,
    recordKey: operation.recordKey ?? null,
    error: error?.message || String(error),
  });
  if (deadLetters.length > MAX_DEAD_LETTERS) deadLetters = deadLetters.slice(-MAX_DEAD_LETTERS);
  console.warn(
    `[DB sync] 서버가 거절한 작업을 건너뜁니다: ${operation.type} ${operation.storeName}` +
      `${operation.recordKey != null ? `#${operation.recordKey}` : ''} — ${error?.message || error}`
  );
}

/** 서버가 영구 거절해 건너뛴 작업 목록(진단용, 메모리 보관). */
export function getServerStoreSyncDeadLetters() {
  return [...deadLetters];
}

export function clearServerStoreSyncDeadLetters() {
  deadLetters = [];
}

function postOperations(operations) {
  return fetchAppJson('/api/db/store-rows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operations }),
  });
}

// 배치가 4xx로 거절되면 어느 작업이 문제인지 모르므로 하나씩 다시 보내 문제 작업만 격리한다.
// 일시 장애(5xx/네트워크)는 여기서 다루지 않고 호출부가 배치를 되돌려 재시도한다.
async function isolateRejectedOperations(operations) {
  for (const operation of operations) {
    try {
      await postOperations([operation]);
    } catch (error) {
      if (isPermanentRejection(error)) {
        parkDeadLetter(operation, error);
        continue;
      }
      throw error;
    }
  }
}

function isPlainRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isBrowserSyncAvailable() {
  if (typeof window === 'undefined') return false;
  if (window.__RND_DISABLE_SERVER_STORE_SYNC__ === true) return false;
  // 뷰어(LAN) 브라우저는 서버로 아무것도 밀어 올리지 않는다. enqueue()에서 막으므로
  // installUnloadFlush()도 호출되지 않아 pagehide sendBeacon 경로까지 함께 닫힌다.
  if (!isAuthoritativeClient()) return false;
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

// clientId를 비우면 서버에서 sourceId=null이 되어, 같은 recordKey를 `__client:<hash>` 로
// 분기시키지 않고 그대로 덮어쓰며 삭제도 전역 적용된다(lib/server/store-row-sync.js 참고).
// 운영 PC가 단일 진실 공급원인 구조에서는 이 authoritative 동작이 맞다.
function clientIdForOptions(options = {}) {
  if (options.includeClientId === false) return '';
  if (isAuthoritativeClient()) return '';
  return getClientId();
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
  flushPromise = postOperations(operations)
    .catch(async error => {
      // 4xx = 서버가 이 배치 안의 무언가를 영구 거절. 통째로 되돌려 재시도하면 그 뒤의 모든
      // 저장이 영원히 막히므로(실제로 수개월치 저장이 서버에 못 간 원인), 문제 작업만 격리한다.
      if (isPermanentRejection(error)) {
        try {
          await isolateRejectedOperations(operations);
          return { ok: true, isolated: true };
        } catch (retryError) {
          error = retryError;
        }
      }
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
