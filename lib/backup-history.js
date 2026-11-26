/**
 * lib/backup-history.js — 백업 다운로드 이력 관리 (localStorage)
 *
 * 브라우저 SPA 한계: 다운로드된 파일을 추적할 수 없음(저장 취소·실패를 알 수 없다).
 * 그래서 시각을 나눠 기록한다 — at: 다운로드를 요청한 시각, fileCheckedAt: 사용자가 저장한 파일을
 * 다시 선택해 읽기 확인을 통과한 시각. (임시 DB 복원 검증은 여기서 기록하지 않는다)
 * 같은 브라우저에서만 보임 (다른 PC에서는 보이지 않음).
 *
 * 저장 형태: localStorage['v3:backup-history'] = JSON 배열
 * 항목: { id, at, scopes, totalRows, fileName, pinned, exportedAt, fileRows, fileCheckedAt }
 * fileCheckedAt 필드가 아예 없는 항목은 이 구분이 생기기 전의 이력이라 확인된 것으로 본다.
 * pinned=true 항목은 MAX_ENTRIES 정리 시에도 삭제되지 않음.
 */

import { asDisplayText, asFiniteNumber, asStringArray } from '@/lib/ui/prop-guards';

const KEY = 'v3:backup-history';
const MAX_ENTRIES = 20; // 최근 20건만 유지

export function normalizeHistoryEntry(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
  const id = asDisplayText(entry.id).trim();
  const at = asDisplayText(entry.at).trim();
  if (!id || !at) return null;
  if (!Number.isFinite(new Date(at).getTime())) return null;

  const totalRows = asFiniteNumber(entry.totalRows, 0);
  return {
    ...entry,
    id,
    at,
    scopes: asStringArray(entry.scopes)
      .map(scope => scope.trim())
      .filter(Boolean),
    totalRows: totalRows != null && totalRows > 0 ? totalRows : 0,
    fileName: asDisplayText(entry.fileName),
    pinned: entry.pinned === true,
  };
}

export function normalizeHistory(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.map(normalizeHistoryEntry).filter(Boolean);
}

/** 이력 전체 읽기 (최신 우선) */
export function getHistory() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return normalizeHistory(arr);
  } catch {
    return [];
  }
}

/** 마지막 백업 다운로드 요청 시각 (없으면 null) */
export function getLastBackupAt() {
  const hist = getHistory();
  return hist.length > 0 ? hist[0].at : null;
}

/** 파일이 확인된(또는 구분이 생기기 전의) 이력인가 */
export function isFileConfirmed(entry) {
  return entry?.fileCheckedAt === undefined || Boolean(entry.fileCheckedAt);
}

const latestOf = times => times.filter(Boolean).sort().at(-1) || null;

/** 마지막으로 파일 확인을 통과한 시각 (없으면 null) */
export function getLastFileCheckedAt() {
  return latestOf(getHistory().map(entry => entry.fileCheckedAt));
}

/** 읽기 확인을 통과한 이력에 확인 시각을 남긴다 */
export function markFileChecked(id) {
  if (typeof localStorage === 'undefined') return false;
  const hist = getHistory();
  if (!hist.some(entry => entry.id === id)) return false;
  const fileCheckedAt = new Date().toISOString();
  const next = hist.map(entry => (entry.id === id ? { ...entry, fileCheckedAt } : entry));
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    return true;
  } catch (err) {
    console.warn('[backup-history] localStorage 저장 실패:', err);
    return false;
  }
}

/**
 * 백업 1건 기록 추가 (최신이 배열 앞)
 * @param {object} entry - { scopes, totalRows, fileName, exportedAt, fileRows }
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
    exportedAt: entry.exportedAt || '',
    fileRows: Number.isFinite(entry.fileRows) ? entry.fileRows : null,
    fileCheckedAt: null,
  };
  // MAX_ENTRIES 초과 시 정리하되 고정(pinned) 항목은 항상 보존 (최신순 유지)
  const all = [newEntry, ...hist];
  let next = all;
  if (all.length > MAX_ENTRIES) {
    const budget = Math.max(0, MAX_ENTRIES - all.filter(e => e.pinned).length);
    let kept = 0;
    next = all.filter(e => {
      if (e.pinned) return true;
      if (kept < budget) {
        kept++;
        return true;
      }
      return false;
    });
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    // 작업 로그 — 백업 이벤트 (지연 import, 실패해도 무시)
    import('@/lib/work-log')
      .then(m =>
        m.logWork(
          'BACKUP',
          `백업 ${newEntry.totalRows}건 (${newEntry.scopes.length || '전체'}개 모듈)`,
          { ref: newEntry.id }
        )
      )
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

/**
 * 백업 리마인더 — 파일이 확인된 마지막 백업으로부터 thresholdDays일 이상 경과 여부.
 * 다운로드를 요청만 하고 확인하지 않은 백업은 세지 않으며, 그런 최신 요청이 있으면 unconfirmed를 붙인다.
 * @param {number} thresholdDays 기본 14일
 * @returns {{ stale: boolean, daysSince: number|null, never: boolean, unconfirmed?: true }}
 */
export function getBackupReminder(thresholdDays = 14) {
  const hist = getHistory();
  const lastAt = latestOf(hist.filter(isFileConfirmed).map(entry => entry.at));
  const waiting = hist.some(entry => !isFileConfirmed(entry) && (!lastAt || entry.at > lastAt));
  const flag = waiting ? { unconfirmed: true } : {};
  const lastTime = lastAt ? new Date(lastAt).getTime() : NaN;
  if (!Number.isFinite(lastTime)) return { stale: true, daysSince: null, never: true, ...flag };
  const daysSince = Math.max(0, Math.floor((Date.now() - lastTime) / (1000 * 60 * 60 * 24)));
  const safeThresholdDays = Math.max(0, Math.floor(asFiniteNumber(thresholdDays, 14) ?? 14));
  return { stale: daysSince >= safeThresholdDays, daysSince, never: false, ...flag };
}

/** 이력 전체 삭제 (고정 항목 포함) */
export function clearHistory() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
