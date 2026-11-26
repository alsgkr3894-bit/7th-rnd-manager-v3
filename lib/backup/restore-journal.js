export const RESTORE_JOURNAL_KEY = 'v3:restore-journal:last';
export const RESTORE_JOURNAL_EVENT = 'restore-journal:changed';

const MAX_STORES = 80;
const MAX_ERRORS = 20;
let journalSeq = 0;
// 이 탭에서 지금 실행 중인 복원 — 새로고침하면 사라지므로, 남은 '진행 중' 일지는 중단된 것이다
let activeRestoreId = null;

const RUNNING_STATUSES = new Set(['running', 'running_group']);
// 사용자가 확인해야 하는 상태 (완료·형식 오류로 아무것도 안 바꾼 경우는 제외)
const ATTENTION_STATUSES = new Set([
  ...RUNNING_STATUSES,
  'failed_partial',
  'completed_with_errors',
]);

function asText(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function safeStoreList(stores) {
  return Array.from(
    new Set((Array.isArray(stores) ? stores : []).map(asText).filter(Boolean))
  ).slice(0, MAX_STORES);
}

function safeErrors(errors) {
  return (Array.isArray(errors) ? errors : []).slice(0, MAX_ERRORS).map(error => ({
    store: asText(error?.store),
    error: asText(error?.error || error?.message || error),
  }));
}

function nextJournalId(startedAt) {
  journalSeq = (journalSeq + 1) % 100000;
  return `restore-${Date.parse(startedAt) || Date.now()}-${journalSeq}`;
}

function safeGroups(groups) {
  return Array.isArray(groups)
    ? groups.slice(0, 10).map(group => ({
        name: asText(group?.name),
        storeCount: Number(group?.storeCount) || 0,
      }))
    : [];
}

/** 해결하지 않은 이전 일지의 요약 — 새 복원이 일지를 덮어써도 경고가 사라지지 않게 남긴다 */
function summaryOf(journal) {
  if (!journal || typeof journal !== 'object') return null;
  return {
    status: asText(journal.status),
    startedAt: asText(journal.startedAt),
    brandId: asText(journal.brandId),
    fileName: asText(journal.fileName),
    safetyBackupFileName: asText(journal.safetyBackupFileName),
    failedGroup: journal.failedGroup ? asText(journal.failedGroup) : null,
    appliedGroups: safeGroups(journal.appliedGroups),
  };
}

function normalizeJournal(entry) {
  const requestedStores = safeStoreList(entry?.requestedStores);
  return {
    id: asText(entry?.id),
    status: asText(entry?.status || 'running'),
    startedAt: asText(entry?.startedAt),
    updatedAt: asText(entry?.updatedAt || entry?.startedAt),
    finishedAt: entry?.finishedAt ? asText(entry.finishedAt) : null,
    brandId: asText(entry?.brandId),
    sourceBrandId: asText(entry?.sourceBrandId),
    requestedStoreCount: Number(entry?.requestedStoreCount ?? requestedStores.length) || 0,
    requestedStores,
    restoreLocalStorage: Boolean(entry?.restoreLocalStorage),
    imported: Number(entry?.imported) || 0,
    skipped: Number(entry?.skipped) || 0,
    currentGroup: entry?.currentGroup ? asText(entry.currentGroup) : null,
    failedGroup: entry?.failedGroup ? asText(entry.failedGroup) : null,
    appliedGroups: safeGroups(entry?.appliedGroups),
    errors: safeErrors(entry?.errors),
    fileName: asText(entry?.fileName),
    safetyBackupFileName: asText(entry?.safetyBackupFileName),
    acknowledgedAt: entry?.acknowledgedAt ? asText(entry.acknowledgedAt) : null,
    unresolved: summaryOf(entry?.unresolved),
  };
}

function notifyJournalChanged() {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(new Event(RESTORE_JOURNAL_EVENT));
}

export function writeRestoreJournal(entry) {
  const normalized = normalizeJournal(entry);
  if (typeof localStorage === 'undefined') return normalized;
  try {
    localStorage.setItem(RESTORE_JOURNAL_KEY, JSON.stringify(normalized));
  } catch (err) {
    console.warn('[backup] restore journal write failed:', err);
  }
  notifyJournalChanged();
  return normalized;
}

export function readRestoreJournal() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(RESTORE_JOURNAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return normalizeJournal(parsed);
  } catch {
    return null;
  }
}

export function clearRestoreJournal() {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.removeItem(RESTORE_JOURNAL_KEY);
    return true;
  } catch {
    return false;
  }
}

export function createRestoreJournal({
  brandId,
  sourceBrandId,
  requestedStores,
  restoreLocalStorage,
  fileName,
  safetyBackupFileName,
} = {}) {
  const startedAt = new Date().toISOString();
  const unresolved = restoreAttentionOf(readRestoreJournal());
  activeRestoreId = nextJournalId(startedAt);
  return writeRestoreJournal({
    id: activeRestoreId,
    fileName,
    safetyBackupFileName,
    unresolved,
    status: 'running',
    startedAt,
    updatedAt: startedAt,
    brandId,
    sourceBrandId,
    requestedStores,
    restoreLocalStorage,
  });
}

/** 이 탭의 복원이 끝났다(성공·실패·예외 모두) */
export function endActiveRestore() {
  activeRestoreId = null;
  notifyJournalChanged();
}

/** 확인이 필요한 복원 상태. 없으면 null */
export function restoreAttentionOf(journal) {
  if (!journal) return null;
  const inProgressHere = journal.id === activeRestoreId && RUNNING_STATUSES.has(journal.status);
  const needsCheck =
    !journal.acknowledgedAt && !inProgressHere && ATTENTION_STATUSES.has(journal.status);
  return needsCheck ? summaryOf(journal) : summaryOf(journal.unresolved);
}

/** 사용자가 복구·데이터 확인을 마쳤다고 표시한다 (일지는 남긴다) */
export function acknowledgeRestoreJournal() {
  const journal = readRestoreJournal();
  if (!journal) return false;
  writeRestoreJournal({ ...journal, acknowledgedAt: new Date().toISOString(), unresolved: null });
  return true;
}

export function updateRestoreJournal(journal, patch = {}) {
  if (!journal) return null;
  return writeRestoreJournal({
    ...journal,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}
