/**
 * lib/backup-history.js — 백업 다운로드 이력 관리 (localStorage)
 *
 * 브라우저 SPA 한계: 다운로드된 파일을 추적할 수 없음.
 * 사용자가 "백업 실행" 버튼을 누른 시각만 기록하여 이력 표시.
 * 같은 브라우저에서만 보임 (다른 PC에서는 보이지 않음).
 *
 * 저장 형태: localStorage['v3:backup-history'] = JSON 배열
 * 항목: { id, at, scopes, totalRows, fileName }
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
 */
export function addEntry(entry) {
  if (typeof localStorage === 'undefined') return;
  const hist = getHistory();
  const newEntry = {
    id: `BK-${Date.now().toString(36)}`,
    at: new Date().toISOString(),
    scopes: entry.scopes || [],
    totalRows: entry.totalRows || 0,
    fileName: entry.fileName || '',
  };
  const next = [newEntry, ...hist].slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch (err) {
    console.warn('[backup-history] localStorage 저장 실패:', err);
  }
}

/** 이력 전체 삭제 */
export function clearHistory() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
