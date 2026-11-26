/**
 * lib/db/startup-snapshot.js — 이 페이지를 열 때 로컬 IndexedDB에 데이터가 있었는지의 스냅샷
 *
 * 서버 덮어쓰기 가드(lib/db/sync-guard.js)는 "로컬이 비어 있는 새 브라우저"를 가려내야 한다. 그런데
 * 화면이 뜬 뒤 가드가 평가되는 시점에는 이미 기본 목록 채우기(예: 제때 관리품목 시드)가 로컬에 행을 넣어
 * 둔 뒤라 "비어 있지 않음"으로 보였다. DB가 열리는 즉시(어떤 쓰기보다 먼저) 한 트랜잭션으로 확인해 두면,
 * IndexedDB가 겹치는 트랜잭션을 만든 순서대로 처리하므로 이후의 쓰기를 반영하지 않는다.
 *
 * 필요한 것은 "데이터가 있었는가"뿐이라 행 수를 세지 않는다. 전체 count()는 행에 비례해 걸려(출고 행
 * 수십만 건) 그동안 첫 저장이 기다렸다. 저장소마다 첫 행의 키 하나만 확인한다.
 *
 * 주의: 이 모듈은 다른 lib/db 모듈을 import하면 안 된다(init.js가 import하므로 순환이 생긴다).
 */

/** 서버와 동기화하지 않는 이 브라우저 고유 상태 — 행 수 합계에서 제외한다. */
export const NON_DATA_STORES = new Set(['settings', 'migration_flags']);

// DB 이름 → 열린 직후 데이터가 있었는지(Promise<boolean|null>). 페이지당 DB 이름별로 한 번만 기록한다.
const snapshots = new Map();

/**
 * DB가 열린 직후(onsuccess 안, resolve 전에) 동기적으로 호출한다. 읽기 트랜잭션을 그 자리에서 만들어야
 * 이어지는 쓰기보다 앞서 처리된다.
 */
export function recordStartupRows(dbName, db) {
  if (snapshots.has(dbName)) return;
  let promise;
  try {
    const names = Array.from(db.objectStoreNames).filter(name => !NON_DATA_STORES.has(name));
    if (names.length === 0) {
      promise = Promise.resolve(false);
    } else {
      const tx = db.transaction(names, 'readonly');
      const checks = names.map(
        name =>
          new Promise(resolve => {
            const request = tx.objectStore(name).openKeyCursor();
            request.onsuccess = () => resolve(Boolean(request.result));
            request.onerror = () => resolve(null);
          })
      );
      promise = Promise.all(checks).then(values => {
        if (values.includes(true)) return true;
        return values.includes(null) ? null : false;
      });
    }
  } catch {
    promise = Promise.resolve(null);
  }
  snapshots.set(dbName, promise);
}

/**
 * 주어진 DB 중 어느 하나라도 시작 시점에 데이터가 있었는지. 기록이 없거나, 데이터를 못 찾았는데
 * 읽지 못한 곳이 있으면 null(= 모름).
 * @param {string[]} dbNames
 * @returns {Promise<boolean|null>}
 */
export async function getStartupHasData(dbNames) {
  let unknown = false;
  for (const name of dbNames) {
    const promise = snapshots.get(name);
    if (!promise) return null;
    const hasData = await promise;
    if (hasData === true) return true;
    if (hasData == null) unknown = true;
  }
  return unknown ? null : false;
}

/** 테스트용 */
export function resetStartupSnapshots() {
  snapshots.clear();
}
