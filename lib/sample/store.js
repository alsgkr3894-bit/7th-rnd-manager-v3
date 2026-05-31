import { getAll, getById, runTransaction, hasStore } from '@/lib/db';
import { logWork } from '@/lib/work-log';

const STORE = 'sample_records';

const byCreatedAtDesc = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);

function storeOf(tx) { return tx.objectStore(STORE); }

/** 0–5 범위의 정수로 정규화, 범위 밖이면 0 */
function clampRating(val) {
  const n = Number(val);
  return Number.isFinite(n) && n >= 0 && n <= 5 ? Math.round(n) : 0;
}

export async function getAllSamples() {
  if (!hasStore(STORE)) return [];
  const rows = await getAll(STORE);
  return rows.sort(byCreatedAtDesc);
}

export async function getSampleById(id) {
  if (!hasStore(STORE)) return null;
  return getById(STORE, id);
}

export async function addSample(data) {
  if (!hasStore(STORE)) throw new Error(`${STORE} store를 찾을 수 없습니다`);
  const now = new Date().toISOString();
  await runTransaction([STORE], 'readwrite', tx => {
    storeOf(tx).add({ ...buildRecord(data), createdAt: now });
  });
  logWork('SAMPLE_SAVE', data.title || data.menuName || '샘플 기록');
}

export async function updateSample(id, data) {
  if (!hasStore(STORE)) throw new Error(`${STORE} store를 찾을 수 없습니다`);
  const existing = await getById(STORE, id);
  if (!existing) throw new Error('샘플을 찾을 수 없습니다');
  await runTransaction([STORE], 'readwrite', tx => {
    storeOf(tx).put({ ...existing, ...buildRecord(data), id });
  });
  logWork('SAMPLE_SAVE', data.title || data.menuName || '샘플 수정', { ref: id }).catch(() => {});
}

export async function deleteSample(id) {
  if (!hasStore(STORE)) throw new Error(`${STORE} store를 찾을 수 없습니다`);
  await runTransaction([STORE], 'readwrite', tx => { storeOf(tx).delete(id); });
}

function buildRecord(data) {
  return {
    title:        (data.title        || '').trim(),
    menuName:     (data.menuName     || '').trim(),
    category:     (data.category     || '').trim(),
    testDate:     (data.testDate     || '').trim(),
    tester:       (data.tester       || '').trim(),
    batchNo:      (data.batchNo      || '').trim(),
    description:  (data.description  || '').trim(),
    result:       (data.result       || '').trim(),
    rating:       clampRating(data.rating),
    improvements: (data.improvements || '').trim(),
    nextAction:   (data.nextAction   || '').trim(),
    tags:         (data.tags         || '').trim(),
    photos:       Array.isArray(data.photos) ? data.photos : [],
    linkedNoteId: data.linkedNoteId ?? null,
    updatedAt:    new Date().toISOString(),
  };
}
