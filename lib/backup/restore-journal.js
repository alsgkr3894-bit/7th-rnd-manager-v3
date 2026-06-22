export const RESTORE_JOURNAL_KEY = 'v3:restore-journal:last';

const MAX_STORES = 80;
const MAX_ERRORS = 20;
let journalSeq = 0;

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
    appliedGroups: Array.isArray(entry?.appliedGroups)
      ? entry.appliedGroups.slice(0, 10).map(group => ({
          name: asText(group?.name),
          storeCount: Number(group?.storeCount) || 0,
        }))
      : [],
    errors: safeErrors(entry?.errors),
  };
}

export function writeRestoreJournal(entry) {
  const normalized = normalizeJournal(entry);
  if (typeof localStorage === 'undefined') return normalized;
  try {
    localStorage.setItem(RESTORE_JOURNAL_KEY, JSON.stringify(normalized));
  } catch (err) {
    console.warn('[backup] restore journal write failed:', err);
  }
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
} = {}) {
  const startedAt = new Date().toISOString();
  return writeRestoreJournal({
    id: nextJournalId(startedAt),
    status: 'running',
    startedAt,
    updatedAt: startedAt,
    brandId,
    sourceBrandId,
    requestedStores,
    restoreLocalStorage,
  });
}

export function updateRestoreJournal(journal, patch = {}) {
  if (!journal) return null;
  return writeRestoreJournal({
    ...journal,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}
