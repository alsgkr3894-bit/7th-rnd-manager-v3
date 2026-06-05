/**
 * lib/backup-history.js — 백업 다운로드 이력 관리 (localStorage)
 *
 * 브라우저 SPA 한계: 다운로드된 파일을 추적할 수 없음.
 * 사용자가 "백업 실행" 버튼을 누른 시각만 기록하여 이력 표시.
 * 같은 브라우저에서만 보임 (다른 PC에서는 보이지 않음).
 *
 * 저장 형태: localStorage['v3:backup-history'] = JSON 배열
 * 항목: { id, at, scopes, totalRows, fileName, pinned }
 * pinned=true 항목은 MAX_ENTRIES 정리 시에도 삭제되지 않음.
 */

const KEY = 'v3:backup-history';
const MAX_ENTRIES = 20; // 최근 20건만 유지

/** 이력 전체 읽기 (최신 우선) */
export function getHistory() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** 마지막 백업 시각 (없으면 null) */
export function getLastBackupAt() {
  const hist = getHistory();
  return hist.length > 0 ? hist[0].at : null;
}

/**
 * 백업 1건 기록 추가 (최신이 배열 앞)
 * @param {object} entry - { scopes, totalRows, fileName }
 * @returns {boolean} 저장 성공 여부 (용량 초과 등 실패 시 false)
 */
export function addEntry(entry) {
  if (typeof localStorage === 'undefined') return false;
  const hist = getHistory();
  const newEntry = {
    id: `BK-${Date.now().toString(36)}`,
    at: new Date().toISOString(),
    scopes: entry.scopes || [],
    totalRows: entry.totalRows || 0,
    fileName: entry.fileName || '',
    pinned: false,
  };
  // MAX_ENTRIES 초과 시 정리하되 고정(pinned) 항목은 항상 보존 (최신순 유지)
  const all = [newEntry, ...hist];
  let next = all;
  if (all.length > MAX_ENTRIES) {
    const budget = Math.max(0, MAX_ENTRIES - all.filter(e => e.pinned).length);
    let kept = 0;
    next = all.filter(e => {
      if (e.pinned) return true;
      if (kept < budget) { kept++; return true; }
      return false;
    });
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    // 작업 로그 — 백업 이벤트 (지연 import, 실패해도 무시)
    import('@/lib/work-log')
      .then(m => m.logWork('BACKUP', `백업 ${newEntry.totalRows}건 (${newEntry.scopes.length || '전체'}개 모듈)`, { ref: newEntry.id }))
      .catch(() => {});
    return true;
  } catch (err) {
    console.warn('[backup-history] localStorage 저장 실패:', err);
    return false;
  }
}

/** 특정 이력의 고정(pinned) 상태 토글 */
export function togglePin(id) {
  if (typeof localStorage === 'undefined') return false;
  const next = getHistory().map(e => (e.id === id ? { ...e, pinned: !e.pinned } : e));
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    return true;
  } catch (err) {
    console.warn('[backup-history] localStorage 저장 실패:', err);
    return false;
  }
}

/** 이력 전체 삭제 (고정 항목 포함) */
export function clearHistory() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
