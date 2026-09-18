/**
 * lib/db/sync-guard.js — 로컬이 비어 있는 authoritative 브라우저의 서버 덮어쓰기 가드
 *
 * 2026-09-17 사고: localhost(=authoritative, lib/db/sync-mode.js)로 접속했지만 로컬
 * IndexedDB가 비어 있는 브라우저에서 "기본 코드 등록" 같은 쓰기 작업을 하면, 서버가 이미
 * 갖고 있던 행이 로컬의 autoincrement id와 충돌해 그대로 덮어써진다(lib/server/
 * store-row-sync.js resolveUpsertRecordKey — authoritative는 clientId가 없어 분기하지
 * 않고 덮어씀). 샌드박스 격리(scripts/dev-sandbox.mjs)는 별도 포트만 막을 뿐, 새 PC나
 * 브라우저 초기화 후 진짜 운영 포트(3000)로 접속해도 이 조건은 그대로 재현된다.
 *
 * 판정: authoritative이고, 서버 총 행(readServerManifest)이 있는데, 이 브라우저의 로컬
 * 행 합계(collectStoreStats, settings/migration_flags 제외)가 0이고, 하이드레이션
 * 저널(readHydrateJournal)이 없으면 → 이 브라우저는 "새로 연결된 빈 authoritative"다.
 * 서버에서 먼저 불러오기 전까지 쓰기를 로컬에는 반영하되 서버로는 밀지 않는다.
 *
 * 평가 자체가 실패하면(서버 다운 등) 차단하지 않는다 — 닫히는 쪽으로 실패하면 정상적인
 * 오프라인 운영 PC까지 멈춘다.
 */
import { getActiveBrandId } from '@/lib/active-brand';
import { collectStoreStats } from './store-stats';
import { readServerManifest, readHydrateJournal } from './server-hydrate';

const NON_DATA_STORES = new Set(['settings', 'migration_flags']);
const GUARD_EVENT = 'server-sync:guard';

let state = {
  blocked: false,
  serverRows: 0,
  localRows: 0,
  heldCount: 0,
  checkedAt: null,
};

function dispatchGuardEvent() {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  try {
    window.dispatchEvent(new CustomEvent(GUARD_EVENT, { detail: { ...state } }));
  } catch {
    // CustomEvent 생성자가 없는 극히 오래된 환경 — 무시(폴링 쪽 getSyncGuardState로 대체됨).
  }
}

/** 현재 가드 상태 스냅샷. */
export function getSyncGuardState() {
  return { ...state };
}

/** enqueue()에서 실제 차단 여부만 빠르게 확인할 때. */
export function isSyncGuardBlocked() {
  return state.blocked;
}

/** 차단 중 서버 푸시가 보류된 작업이 있었음을 기록(배너 카운트용). */
export function noteSyncGuardHeld() {
  state = { ...state, heldCount: state.heldCount + 1 };
  dispatchGuardEvent();
}

/** 서버에서 성공적으로 불러온 뒤(hydrateFromServer) 호출 — 가드를 해제한다. */
export function clearSyncGuard() {
  state = {
    blocked: false,
    serverRows: 0,
    localRows: 0,
    heldCount: 0,
    checkedAt: new Date().toISOString(),
  };
  dispatchGuardEvent();
}

/**
 * 가드 조건을 재평가한다. 앱 마운트 시 1회, 또는 필요할 때 호출.
 * @param {string} [brandId]
 * @returns {Promise<ReturnType<typeof getSyncGuardState>>}
 */
export async function evaluateSyncGuard(brandId = getActiveBrandId()) {
  try {
    if (readHydrateJournal()) {
      // 이 브라우저는 최소 한 번 서버에서 불러온 적이 있다 — 그 사이 서버가 다시
      // 텅 비었다가 채워지는 등의 극단적 케이스는 다루지 않는다(운영 PC 단일 구조 전제).
      state = { ...state, blocked: false, checkedAt: new Date().toISOString() };
      dispatchGuardEvent();
      return getSyncGuardState();
    }

    const [manifest, localStats] = await Promise.all([
      readServerManifest(brandId),
      collectStoreStats(),
    ]);
    const serverRows = manifest?.totalRows || 0;
    const localRows = Object.entries(localStats || {})
      .filter(([storeName]) => !NON_DATA_STORES.has(storeName))
      .reduce((sum, [, count]) => sum + (count || 0), 0);
    const blocked = serverRows > 0 && localRows === 0;

    state = { ...state, blocked, serverRows, localRows, checkedAt: new Date().toISOString() };
    dispatchGuardEvent();
  } catch (error) {
    console.warn('[sync-guard] 평가 실패(차단하지 않음):', error?.message || String(error));
  }
  return getSyncGuardState();
}
