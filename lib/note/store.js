import { getAll, getById, runTransaction, hasStore } from '@/lib/db';

const STORE = 'menu_dev_notes';

function s(tx) { return tx.objectStore(STORE); }

export async function getAllNotes() {
  if (!hasStore(STORE)) return [];
  const rows = await getAll(STORE);
  return rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getNoteById(id) {
  if (!hasStore(STORE)) return null;
  return getById(STORE, id);
}

export async function addNote(data) {
  if (!hasStore(STORE)) throw new Error('menu_dev_notes store 없음');
  const now = new Date().toISOString();
  const record = { ...buildRecord(data), createdAt: now };
  await runTransaction([STORE], 'readwrite', tx => { s(tx).add(record); });
}

export async function updateNote(id, data) {
  if (!hasStore(STORE)) throw new Error('menu_dev_notes store 없음');
  const existing = await getById(STORE, id);
  if (!existing) throw new Error('노트를 찾을 수 없습니다');
  await runTransaction([STORE], 'readwrite', tx => {
    s(tx).put({ ...existing, ...buildRecord(data), id });
  });
}

export async function deleteNote(id) {
  if (!hasStore(STORE)) throw new Error('menu_dev_notes store 없음');
  await runTransaction([STORE], 'readwrite', tx => { s(tx).delete(id); });
}

/** parentId 체인 전체 반환 — 루트 → 현재 → 자손 순 */
export async function getNotesInChain(noteId) {
  if (!hasStore(STORE)) return [];
  const all = await getAll(STORE);
  const byId = new Map(all.map(n => [n.id, n]));

  // 조상 탐색 (현재 포함)
  const ancestors = [];
  let cur = byId.get(noteId);
  while (cur) {
    ancestors.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : null;
  }
  if (!ancestors.length) return [];

  // 자손 탐색
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
    parentId:      data.parentId != null ? Number(data.parentId) : null,
    tempCostCalc:  data.tempCostCalc   != null ? data.tempCostCalc : null,
    updatedAt: new Date().toISOString(),
  };
}
