/**
 * lib/db/server-hydrate.js — 서버(store_rows) → 브라우저 IndexedDB 하이드레이션
 *
 * LAN 뷰어 PC가 자기 IndexedDB를 운영 PC의 데이터로 채우는 경로다.
 * 푸시(`server-sync.js`)의 정반대 방향이며, Phase 1에서는 명시적인 버튼으로만 실행된다.
 *
 * 지켜야 할 것:
 * - 기록은 반드시 `syncToServer: false` 로. 그렇지 않으면 내려받은 데이터를 그대로 서버에
 *   되밀어 올리는 피드백 루프가 생긴다.
 * - `assertActiveAdmin` 을 타는 함수(importAllToBrand 등)를 호출하면 안 된다.
 *   이 기능을 실제로 쓰는 사람은 viewer 역할로 고정된 LAN 사용자다.
 * - HTTP는 `fetchAppJson`, IndexedDB 열기는 `openNamed` 만 사용한다
 *   (browser-api-policy / storage-access-policy 테스트가 강제).
 */
import { fetchAppJson } from '@/lib/session';

import { writeStoresInDbTransaction } from './backup';
import { ALL_STORES, dbNameFor } from './constants';
import { getNamed, openNamed } from './init';
import { SHARED_STORE_NAMES } from './module-stores';

export const HYDRATE_JOURNAL_KEY = 'v3:server-hydrate:last';

// server-sync.js 의 NON_ID_KEY_PATHS 와 반드시 같아야 한다 — 올릴 때와 내릴 때 키 해석이
// 어긋나면 레코드가 엉뚱한 키로 들어간다.
const NON_ID_KEY_PATHS = {
  settings: 'key',
  migration_flags: 'flag',
};

function keyPathForStore(storeName) {
  return NON_ID_KEY_PATHS[storeName] || 'id';
}

/**
 * 서버 행 하나를 IndexedDB에 넣을 레코드로 되돌린다.
 *
 * 키 타입이 핵심이다. 대부분의 store는 `keyPath:'id', autoIncrement:true` 라서 키가 숫자다.
 * 문자열 '12' 와 숫자 12 는 IndexedDB에서 서로 다른 키이므로, 여기서 타입을 틀리면
 * fileId·parentId·ingredientId 같은 store 간 참조가 전부 조용히 끊어진다.
 * 그래서 recordKey 문자열보다 legacyNumericId(Int 컬럼)를 우선한다.
 */
export function materializeRecord(storeName, row) {
  const data = row?.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;

  const keyPath = keyPathForStore(storeName);
  if (data[keyPath] != null) return data;

  if (Number.isInteger(row?.legacyNumericId)) {
    return { ...data, [keyPath]: row.legacyNumericId };
  }
  const recordKey = row?.recordKey;
  if (recordKey == null || recordKey === '') return data;
  const numeric = /^-?\d+$/.test(String(recordKey)) ? Number(recordKey) : null;
  return { ...data, [keyPath]: numeric != null ? numeric : String(recordKey) };
}

function dbNameForStore(storeName, brandId) {
  return SHARED_STORE_NAMES.has(storeName) ? dbNameFor('main') : dbNameFor(brandId);
}

function query(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') search.set(key, String(value));
  }
  return search.toString();
}

/** 스토어별 서버 행 수 요약. 진행률 분모이자 "무시된 중복" 표시 원본. */
export function readServerManifest(brandId) {
  return fetchAppJson(`/api/db/store-rows?${query({ manifest: '1', brandId })}`);
}

function writeJournal(entry) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(HYDRATE_JOURNAL_KEY, JSON.stringify(entry));
  } catch (error) {
    console.warn('[hydrate] 저널 기록 실패:', error?.message || String(error));
  }
}

export function readHydrateJournal() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(HYDRATE_JOURNAL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * 서버 데이터를 IndexedDB로 내려받는다. 스토어별로 clear 후 페이지 단위로 이어 붙인다.
 *
 * 로컬을 파괴적으로 덮어쓰므로 호출 측에서 모드/확인을 반드시 게이팅할 것.
 *
 * @param {string} brandId
 * @param {{ stores?: string[], onProgress?: (p: object) => void }} [options]
 */
export async function hydrateFromServer(brandId = 'main', options = {}) {
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};

  const manifest = await readServerManifest(brandId);
  const requested =
    Array.isArray(options.stores) && options.stores.length > 0 ? new Set(options.stores) : null;

  const targets = (manifest.stores || []).filter(
    entry => ALL_STORES.includes(entry.storeName) && (!requested || requested.has(entry.storeName))
  );

  // 두 DB(브랜드/공유 main)를 모두 열어둔다.
  await openNamed(dbNameFor(brandId));
  await openNamed(dbNameFor('main'));

  const startedAt = new Date().toISOString();
  const applied = {};
  const skipped = [];
  const failed = [];
  let totalRows = 0;

  const plannedRows = targets.reduce((sum, entry) => sum + (entry.rows || 0), 0);
  onProgress({ phase: 'start', totalStores: targets.length, plannedRows });

  for (const entry of targets) {
    const { storeName } = entry;
    const db = getNamed(dbNameForStore(storeName, brandId));

    // 로컬 스키마에 없는 store(버전 차이)는 건너뛴다 — 없는 store로 트랜잭션을 열면 throw.
    if (!db || !db.objectStoreNames.contains(storeName)) {
      skipped.push({ storeName, reason: 'store-missing' });
      continue;
    }

    let after = '';
    let first = true;
    let storeRows = 0;

    try {
      // 서버에 행이 0개면 루프가 돌지 않으므로, 로컬에 남은 낡은 행을 비우기 위해
      // 빈 쓰기로 clear만 한 번 수행한다.
      for (;;) {
        const page = await fetchAppJson(
          `/api/db/store-rows?${query({ brandId, storeName, after })}`
        );
        const rows = Array.isArray(page.rows) ? page.rows : [];
        if (rows.length === 0) break;

        const records = rows.map(row => materializeRecord(storeName, row)).filter(Boolean);
        await writeStoresInDbTransaction(db, [[storeName, records]], {
          clear: first,
          syncToServer: false,
          brandId,
        });

        first = false;
        storeRows += records.length;
        totalRows += records.length;
        after = page.nextCursor;
        onProgress({
          phase: 'store',
          storeName,
          storeRows,
          storeTotal: entry.rows || 0,
          totalRows,
          plannedRows,
        });
        if (!after) break;
      }

      if (first) {
        await writeStoresInDbTransaction(db, [[storeName, []]], {
          clear: true,
          syncToServer: false,
          brandId,
        });
      }
      applied[storeName] = storeRows;
    } catch (error) {
      console.error(`[hydrate] ${storeName} 적용 실패:`, error);
      failed.push({ storeName, error: error?.message || String(error) });
    }
  }

  const journal = {
    startedAt,
    finishedAt: new Date().toISOString(),
    brandId,
    applied,
    totalRows,
    skipped,
    failed,
    ok: failed.length === 0,
    serverForkedRows: manifest.totalForkedRows || 0,
  };
  writeJournal(journal);
  onProgress({ phase: 'done', ...journal });
  return journal;
}
