import { getAll, getById, runTransaction, hasStore } from '@/lib/db';
import { logWork } from '@/lib/work-log';

const STORE = 'menu_dev_notes';

const byCreatedAtDesc = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);

function storeOf(tx) { return tx.objectStore(STORE); }

/** Number로 변환 가능한 id → number, 아니면 null */
function toNullableId(val) {
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

export async function getAllNotes() {
  if (!hasStore(STORE)) return [];
  const rows = await getAll(STORE);
  return rows.sort(byCreatedAtDesc);
}

export async function getNoteById(id) {
  if (!hasStore(STORE)) return null;
  return getById(STORE, id);
}

export async function addNote(data) {
  if (!hasStore(STORE)) throw new Error(`${STORE} store를 찾을 수 없습니다`);
  const now = new Date().toISOString();
  const record = { ...buildRecord(data), createdAt: now };
  let insertedId = null;
  await runTransaction([STORE], 'readwrite', tx => {
    const req = storeOf(tx).add(record);
    req.onsuccess = () => { insertedId = req.result; };
  });
  logWork('NOTE_CREATE', data.title || data.menuName || '새 노트', { ref: insertedId });
  return insertedId;
}

export async function updateNote(id, data) {
  if (!hasStore(STORE)) throw new Error(`${STORE} store를 찾을 수 없습니다`);
  const existing = await getById(STORE, id);
  if (!existing) throw new Error('노트를 찾을 수 없습니다');
  await runTransaction([STORE], 'readwrite', tx => {
    storeOf(tx).put({ ...existing, ...buildRecord(data), id });
  });
  logWork('NOTE_UPDATE', data.title || data.menuName || existing.title || '노트 수정', { ref: id });
}

export async function deleteNote(id) {
  if (!hasStore(STORE)) throw new Error(`${STORE} store를 찾을 수 없습니다`);
  await runTransaction([STORE], 'readwrite', tx => { storeOf(tx).delete(id); });
}

/** parentId 체인 전체 반환 — 루트 → 현재 → 자손 순 */
export async function getNotesInChain(noteId) {
  if (!hasStore(STORE)) return [];
  const all = await getAll(STORE);
  const byId = new Map(all.map(n => [n.id, n]));

  const ancestors = [];
  let cur = byId.get(noteId);
  while (cur) {
    ancestors.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : null;
  }
  if (!ancestors.length) return [];

  function children(id) {
    return all.filter(n => n.parentId === id)
              .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }
  function walk(id, acc) {
    for (const c of children(id)) { acc.push(c); walk(c.id, acc); }
  }
  const root = ancestors[0];
  const chain = [];
  walk(root.id, chain);
  return [root, ...chain];
}

export async function duplicateNote(id) {
  const note = await getNoteById(id);
  if (!note) throw new Error('노트를 찾을 수 없습니다');
  const now = new Date().toISOString();
  const copy = {
    ...buildRecord({ ...note, title: note.title + ' (복사)', status: '아이디어', parentId: null }),
    createdAt: now,
  };
  const req = await runTransaction([STORE], 'readwrite', tx => storeOf(tx).add(copy));
  return req?.result ?? null;
}

function buildRecord(data) {
  return {
    title:         (data.title         || '').trim(),
    menuName:      (data.menuName      || '').trim(),
    category:      (data.category      || '').trim(),
    noteType:      (data.noteType      || '').trim(),
    status:        (data.status        || '아이디어').trim(),
    testContent:   (data.testContent   || '').trim(),
    testDate:      (data.testDate      || '').trim(),
    materials:     (data.materials     || '').trim(),
    tasteEval:     (data.tasteEval     || '').trim(),
    managerEval:   (data.managerEval   || '').trim(),
    costNote:      (data.costNote      || '').trim(),
    improvements:  (data.improvements  || '').trim(),
    nextAction:    (data.nextAction    || '').trim(),
    reportSummary: (data.reportSummary || '').trim(),
    tags:          (data.tags          || '').trim(),
    parentId:      toNullableId(data.parentId),
    tempCostCalc:  data.tempCostCalc != null ? data.tempCostCalc : null,
    updatedAt:     new Date().toISOString(),
  };
}
