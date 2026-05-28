import { getAll, getById, runTransaction, hasStore } from '@/lib/db';

const STORE = 'sample_records';

function s(tx) { return tx.objectStore(STORE); }

export async function getAllSamples() {
  if (!hasStore(STORE)) return [];
  const rows = await getAll(STORE);
  return rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getSampleById(id) {
  if (!hasStore(STORE)) return null;
  return getById(STORE, id);
}

export async function addSample(data) {
  if (!hasStore(STORE)) throw new Error('sample_records store 없음');
  const now = new Date().toISOString();
  await runTransaction([STORE], 'readwrite', tx => {
    s(tx).add({ ...buildRecord(data), createdAt: now });
  });
}

export async function updateSample(id, data) {
  if (!hasStore(STORE)) throw new Error('sample_records store 없음');
  const existing = await getById(STORE, id);
  if (!existing) throw new Error('샘플을 찾을 수 없습니다');
  await runTransaction([STORE], 'readwrite', tx => {
    s(tx).put({ ...existing, ...buildRecord(data), id });
  });
}

export async function deleteSample(id) {
  if (!hasStore(STORE)) throw new Error('sample_records store 없음');
  await runTransaction([STORE], 'readwrite', tx => { s(tx).delete(id); });
}

function buildRecord(data) {
  return {
    title:       (data.title       || '').trim(),
    menuName:    (data.menuName    || '').trim(),
    category:    (data.category    || '').trim(),
    testDate:    (data.testDate    || '').trim(),
    tester:      (data.tester      || '').trim(),
    batchNo:     (data.batchNo     || '').trim(),
    description: (data.description || '').trim(),
    result:      (data.result      || '').trim(),
    rating:      (() => { const r = Number(data.rating); return Number.isFinite(r) && r >= 0 && r <= 5 ? Math.round(r) : 0; })(),
    improvements:(data.improvements|| '').trim(),
    nextAction:  (data.nextAction  || '').trim(),
    tags:        (data.tags        || '').trim(),
    photos:      Array.isArray(data.photos) ? data.photos : [],
    updatedAt:   new Date().toISOString(),
  };
}
