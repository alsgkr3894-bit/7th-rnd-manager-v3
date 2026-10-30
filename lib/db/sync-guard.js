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
 * 2026-10-30 보강 — 새 브라우저에서 화면이 뜨자마자 기본 제품 목록이 서버의 제때 관리품목을 덮어쓰려던
 * 문제(점검에서 발견, 저장 요청을 막아 둔 상태여서 실제 덮어쓰기는 없었음):
 *  - 시작값이 '안 막음'이라 평가가 끝나기 전의 쓰기가 그대로 서버로 갔다 → 평가 전에는 쓰기를 '보류'한다
 *    (isSyncGuardPending, server-sync.js가 평가가 끝날 때까지 큐에 넣지 않고 들고 있는다).
 *  - 평가는 화면이 뜬 뒤에야 돌아 이미 시드가 로컬에 행을 넣은 뒤라 '비어 있음'을 못 알아봤다 → DB가 열린
 *    즉시 세어 둔 시작 시점 행 수(startup-snapshot.js)로 판단한다.
 *  - 다음에 다시 열면 시드된 행 때문에 '비어 있지 않음'으로 보여 풀렸다 → 비어 있던 채로 시작한 브라우저는
 *    서버에서 불러오기 전까지 표식(localStorage)을 남겨 계속 막는다.
 *
 * 평가 자체가 실패하면(서버 다운 등) 이전엔 차단하지 않았다 — 닫히는 쪽으로 실패하면 정상적인 오프라인
 * 운영 PC까지 멈추기 때문이다. 다만 '비어 있던 채로 시작한' 브라우저(표식이 있는 경우)는 지킬 로컬
 * 데이터가 없으니 평가가 실패해도 계속 막는다.
 */
import { getActiveBrandId } from '@/lib/active-brand';
import { dbNameFor } from './constants';
import { openNamed } from './init';
import { collectStoreStats } from './store-stats';
import { readServerManifest, readHydrateJournal } from './server-hydrate';
import { isAuthoritativeClient } from './sync-mode';
import { NON_DATA_STORES, getStartupLocalRows } from './startup-snapshot';

/** 이 브랜드를 성공적으로 불러온 기록이 있는지 — 다른 브랜드 기록으로는 통과시키지 않는다. */
export function hasHydratedBrand(journal, brandId) {
  if (!journal || journal.ok === false) return false;
  // brandId가 없는 옛 기록은 main으로 본다
  return String(journal.brandId || 'main') === String(brandId || 'main');
}

const GUARD_EVENT = 'server-sync:guard';
// 서버 매니페스트 확인이 이 시간 안에 안 끝나면 '평가 실패'로 본다(쓰기를 무한정 들고 있지 않게)
const EVALUATION_TIMEOUT_MS = 8000;
// 비어 있던 채로 시작해 아직 서버에서 불러오지 않은 브라우저의 표식(브랜드별)
const UNHYDRATED_MARKER_PREFIX = 'v3:sync-guard:unhydrated:';

// 평가를 마친 브랜드 — 이 값이 활성 브랜드와 다르면 아직 '평가 전'이다
let evaluatedBrandId = null;
let evaluationPromise = null;

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

function markerKey(brandId) {
  return `${UNHYDRATED_MARKER_PREFIX}${brandId || 'main'}`;
}

function hasUnhydratedMarker(brandId) {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(markerKey(brandId)) === '1';
  } catch {
    return false;
  }
}

function setUnhydratedMarker(brandId) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(markerKey(brandId), '1');
  } catch {
    // 저장 불가(사생활 모드 등) — 이번 페이지의 판단만 유효하다
  }
}

function clearUnhydratedMarker(brandId) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(markerKey(brandId));
  } catch {
    // 무시
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

/**
 * 이 브라우저가 서버에 쓰기를 밀어도 되는지 아직 판단하지 못했는가 — authoritative 브라우저에서
 * 활성 브랜드의 평가가 끝나기 전. 이 동안의 쓰기는 서버로 보내지 말고 평가가 끝날 때까지 들고 있어야 한다.
 */
export function isSyncGuardPending() {
  return evaluatedBrandId !== getActiveBrandId() && isAuthoritativeClient();
}

/** 평가를 한 번만 돌리고(동시 호출은 같은 Promise를 공유) 끝나면 상태를 돌려준다. */
export function ensureSyncGuardEvaluated(brandId = getActiveBrandId()) {
  if (evaluatedBrandId === brandId) return Promise.resolve(getSyncGuardState());
  if (!evaluationPromise) {
    evaluationPromise = evaluateSyncGuard(brandId).finally(() => {
      evaluationPromise = null;
    });
  }
  return evaluationPromise;
}

/** 차단 중 서버 푸시가 보류된 작업이 있었음을 기록(배너 카운트용). */
export function noteSyncGuardHeld() {
  state = { ...state, heldCount: state.heldCount + 1 };
  dispatchGuardEvent();
}

/** 서버에서 성공적으로 불러온 뒤(hydrateFromServer) 호출 — 가드를 해제한다. */
export function clearSyncGuard() {
  clearUnhydratedMarker(getActiveBrandId());
  evaluatedBrandId = getActiveBrandId();
  state = {
    blocked: false,
    serverRows: 0,
    localRows: 0,
    heldCount: 0,
    checkedAt: new Date().toISOString(),
  };
  dispatchGuardEvent();
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('서버 확인 시간 초과')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** 가드가 볼 이 브랜드의 로컬 데이터 행 수 — 시작 시점 스냅샷이 있으면 그것을, 없으면 지금 센다. */
async function localRowsForGuard(brandId) {
  const dbNames = [dbNameFor(brandId)];
  // 노트 패밀리 등 공유 store는 항상 main DB에 산다
  if (brandId !== 'main') dbNames.push(dbNameFor('main'));
  // 평가가 DB가 열리기도 전에 시작될 수 있다 — 먼저 열어 둔다. 처음 여는 순간 startup-snapshot이
  // 어떤 쓰기보다 앞서 행 수를 세어 두므로, 누가 먼저 열든 시작 시점 값이 기록된다.
  try {
    await Promise.all(dbNames.map(name => openNamed(name)));
  } catch {
    // IndexedDB를 못 열면 아래에서 지금 상태를 직접 센다
  }
  const atStartup = await getStartupLocalRows(dbNames);
  if (atStartup != null) return atStartup;
  const localStats = await collectStoreStats();
  return Object.entries(localStats || {})
    .filter(([storeName]) => !NON_DATA_STORES.has(storeName))
    .reduce((sum, [, count]) => sum + (count || 0), 0);
}

/**
 * 가드 조건을 재평가한다. 앱 마운트 시 1회, 또는 필요할 때 호출.
 * @param {string} [brandId]
 * @returns {Promise<ReturnType<typeof getSyncGuardState>>}
 */
export async function evaluateSyncGuard(brandId = getActiveBrandId()) {
  try {
    if (hasHydratedBrand(readHydrateJournal(), brandId)) {
      // 이 브라우저는 최소 한 번 서버에서 불러온 적이 있다 — 그 사이 서버가 다시
      // 텅 비었다가 채워지는 등의 극단적 케이스는 다루지 않는다(운영 PC 단일 구조 전제).
      clearUnhydratedMarker(brandId);
      state = { ...state, blocked: false, checkedAt: new Date().toISOString() };
      dispatchGuardEvent();
      return getSyncGuardState();
    }

    const localRows = await localRowsForGuard(brandId);
    // 비어 있던 채로 시작했다면 서버에서 불러오기 전까지 표식을 남긴다 — 다음에 열었을 때 시드된 행
    // 때문에 '비어 있지 않음'으로 보여 가드가 풀리는 것을 막는다.
    if (localRows === 0) setUnhydratedMarker(brandId);
    const unhydrated = hasUnhydratedMarker(brandId);

    let serverRows;
    try {
      const manifest = await withTimeout(readServerManifest(brandId), EVALUATION_TIMEOUT_MS);
      serverRows = manifest?.totalRows || 0;
    } catch (error) {
      // 서버를 못 읽었다 — 지킬 로컬 데이터가 있는 운영 PC는 막지 않지만, 비어 있던 채로 시작한
      // 브라우저는 서버 확인 전까지 계속 막는다.
      console.warn('[sync-guard] 서버 확인 실패:', error?.message || String(error));
      state = { ...state, blocked: unhydrated, localRows, checkedAt: new Date().toISOString() };
      dispatchGuardEvent();
      return getSyncGuardState();
    }

    // 서버가 비어 있으면(새 설치) 덮어쓸 것이 없다 — 표식도 지운다
    if (serverRows === 0) clearUnhydratedMarker(brandId);
    const blocked = serverRows > 0 && (localRows === 0 || unhydrated);

    state = { ...state, blocked, serverRows, localRows, checkedAt: new Date().toISOString() };
    dispatchGuardEvent();
  } catch (error) {
    console.warn('[sync-guard] 평가 실패:', error?.message || String(error));
    // 표식이 있는(비어 있던 채로 시작한) 브라우저만 계속 막는다 — 그 외에는 이전처럼 막지 않는다
    state = {
      ...state,
      blocked: hasUnhydratedMarker(brandId),
      checkedAt: new Date().toISOString(),
    };
    dispatchGuardEvent();
  } finally {
    // 성공이든 실패든 평가는 끝났다 — 보류 중이던 쓰기를 풀어 주거나(차단 아님) 버린다(차단)
    evaluatedBrandId = brandId;
  }
  return getSyncGuardState();
}
