/**
 * lib/db/server-repush.js — 운영 PC의 로컬 IndexedDB 전체를 서버로 다시 밀어 올린다.
 *
 * 평소 동기화는 "저장한 행만" 서버로 간다. 그래서 서버 사본이 어떤 이유로든(복구·거절·유실)
 * PC보다 뒤처지면, PC에서 그 행을 다시 저장하기 전까지 서버는 계속 낡은 값을 갖는다.
 * 이 모듈은 PC를 진실 공급원으로 놓고 서버를 PC와 같게 만든다:
 *   1) 로컬의 모든 행을 upsert로 재전송 (서버는 dataHash가 같으면 no-op)
 *   2) 서버에만 있는 행(로컬에서 이미 지운 것)을 delete
 *
 * 안전장치: authoritative(운영 PC) 브라우저에서만, 로컬이 비어 있지 않을 때만 동작하고,
 * 로컬이 비어 있는 store는 삭제 대상에서 제외한다(빈 로컬이 서버를 비우는 사고 방지).
 */
import { getActiveBrandId } from '@/lib/active-brand';
import { fetchAppJson } from '@/lib/session';
import { LAN_EXCLUDED_STORE_NAMES } from '@/lib/server/sensitive-stores';

import { ALL_STORES, dbNameFor } from './constants';
import { getNamed, openNamed } from './init';
import { SHARED_STORE_NAMES } from './module-stores';
import { readServerManifest } from './server-hydrate';
import {
  drainServerStoreSyncQueue,
  getServerStoreSyncDeadLetters,
  keyPathForStore,
  queueStoreRowDelete,
  queueStoreRowUpsert,
} from './server-sync';
import { isSyncGuardBlocked } from './sync-guard';
import { isAuthoritativeClient, isSyncModeForcedReadonly } from './sync-mode';

const CHUNK_SIZE = 500;

function dbForStore(storeName, brandId) {
  return getNamed(dbNameFor(SHARED_STORE_NAMES.has(storeName) ? 'main' : brandId));
}

function idbRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readAllKeys(db, storeName) {
  return idbRequest(db.transaction(storeName, 'readonly').objectStore(storeName).getAllKeys());
}

function readChunk(db, storeName, afterKey) {
  const store = db.transaction(storeName, 'readonly').objectStore(storeName);
  const range = afterKey === undefined ? undefined : IDBKeyRange.lowerBound(afterKey, true);
  return idbRequest(store.getAll(range, CHUNK_SIZE));
}

async function readServerKeys(brandId, storeName) {
  const keys = [];
  let after = '';
  for (;;) {
    const search = new URLSearchParams({ brandId, storeName });
    if (after) search.set('after', after);
    const page = await fetchAppJson(`/api/db/store-rows?${search.toString()}`);
    const rows = Array.isArray(page.rows) ? page.rows : [];
    for (const row of rows) if (row?.recordKey != null) keys.push(String(row.recordKey));
    after = page.nextCursor;
    if (rows.length === 0 || !after) break;
  }
  return keys;
}

export function getServerRepushBlockReason() {
  if (typeof window === 'undefined') return '브라우저에서만 실행할 수 있습니다.';
  if (isSyncModeForcedReadonly()) return '이 서버는 환경변수로 읽기 전용으로 고정돼 있습니다.';
  if (!isAuthoritativeClient())
    return '운영 PC(쓰기 동기화 켜짐) 브라우저에서만 실행할 수 있습니다.';
  if (isSyncGuardBlocked())
    return '로컬이 비어 있어 서버로 밀 수 없습니다. 먼저 서버에서 불러오세요.';
  return '';
}

/**
 * 재전송 계획: store별 로컬 행 수, 서버 행 수, 서버에만 있어 삭제될 키.
 * 서버 키 조회는 서버·로컬 행 수가 다른 store에서만 한다(같으면 키 비교를 생략).
 *
 * @returns {Promise<{ brandId, stores: object[], totalUpserts: number, totalDeletes: number }>}
 */
export async function planServerRepush(brandId = getActiveBrandId()) {
  const reason = getServerRepushBlockReason();
  if (reason) throw new Error(reason);

  await openNamed(dbNameFor(brandId));
  await openNamed(dbNameFor('main'));
  const manifest = await readServerManifest(brandId);
  const serverRowsByStore = new Map(
    (manifest.stores || []).map(entry => [entry.storeName, entry.rows || 0])
  );

  const stores = [];
  for (const storeName of ALL_STORES) {
    if (LAN_EXCLUDED_STORE_NAMES.has(storeName)) continue;
    const db = dbForStore(storeName, brandId);
    if (!db || !db.objectStoreNames.contains(storeName)) continue;

    const localKeys = await readAllKeys(db, storeName);
    const serverRows = serverRowsByStore.get(storeName) || 0;
    const entry = {
      storeName,
      localRows: localKeys.length,
      serverRows,
      deleteKeys: [],
      deleteSkipped: false,
    };

    if (serverRows > 0 && localKeys.length === 0) {
      entry.deleteSkipped = true;
    } else if (serverRows !== localKeys.length) {
      const localKeySet = new Set(localKeys.map(String));
      const serverKeys = await readServerKeys(brandId, storeName);
      entry.deleteKeys = serverKeys.filter(key => !localKeySet.has(key));
    }
    stores.push(entry);
  }

  const totalUpserts = stores.reduce((sum, entry) => sum + entry.localRows, 0);
  if (totalUpserts === 0) throw new Error('로컬에 서버로 보낼 데이터가 없습니다.');
  const totalDeletes = stores.reduce((sum, entry) => sum + entry.deleteKeys.length, 0);
  return { brandId, stores, totalUpserts, totalDeletes };
}

/**
 * planServerRepush() 결과를 실행한다. store 단위로 청크를 큐에 넣고 서버 전송이 끝날 때까지
 * 기다린 뒤 다음 청크로 넘어간다(큐가 메모리에 한꺼번에 쌓이지 않게).
 */
export async function runServerRepush(plan, options = {}) {
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
  const reason = getServerRepushBlockReason();
  if (reason) throw new Error(reason);

  const { brandId } = plan;
  const deadLettersBefore = getServerStoreSyncDeadLetters().length;
  const startedAt = new Date().toISOString();
  let sentRows = 0;
  let deletedRows = 0;
  const plannedRows = plan.totalUpserts + plan.totalDeletes;

  for (const entry of plan.stores) {
    const { storeName } = entry;
    const db = dbForStore(storeName, brandId);
    const keyPath = keyPathForStore(storeName);
    let afterKey;
    for (;;) {
      const records = await readChunk(db, storeName, afterKey);
      if (records.length === 0) break;
      for (const record of records) {
        queueStoreRowUpsert(storeName, record?.[keyPath], record, { brandId });
      }
      await drainServerStoreSyncQueue();
      sentRows += records.length;
      afterKey = records[records.length - 1]?.[keyPath];
      onProgress({ phase: 'store', storeName, doneRows: sentRows + deletedRows, plannedRows });
      if (records.length < CHUNK_SIZE || afterKey === undefined) break;
    }

    for (const key of entry.deleteKeys) queueStoreRowDelete(storeName, key, { brandId });
    if (entry.deleteKeys.length > 0) {
      await drainServerStoreSyncQueue();
      deletedRows += entry.deleteKeys.length;
      onProgress({ phase: 'store', storeName, doneRows: sentRows + deletedRows, plannedRows });
    }
  }

  const result = {
    startedAt,
    finishedAt: new Date().toISOString(),
    brandId,
    sentRows,
    deletedRows,
    rejectedRows: getServerStoreSyncDeadLetters().length - deadLettersBefore,
  };
  onProgress({ phase: 'done', ...result });
  return result;
}
