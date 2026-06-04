import {
  sharedGetAll as getAll,
  sharedGetById as getById,
  sharedGetByIndex as getByIndex,
  sharedDeleteById as deleteById,
  sharedRunTransaction as runTransaction,
  sharedHasStore as hasStore,
} from '@/lib/db/shared';
import { logWork } from '@/lib/work-log';
import { KEYS } from '@/lib/note/keys';

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

/**
 * 새 노트를 IndexedDB에 추가합니다.
 *
 * @param {{
 *   title?: string,
 *   menuName?: string,
 *   status?: string,
 *   category?: string,
 *   noteType?: string,
 *   parentId?: number|null,
 *   [key: string]: any
 * }} data - 노트 필드 (buildRecord에서 정규화됨)
 * @returns {Promise<number>} 추가된 노트의 auto-increment ID
 */
export async function addNote(data) {
  if (!hasStore(STORE)) throw new Error(`${STORE} store를 찾을 수 없습니다`);
  // 제목과 메뉴명이 모두 빈 경우 저장 차단 (UI 검증이 건너뛰어질 경우 대비)
  if (!data.title?.trim() && !data.menuName?.trim()) {
    throw new Error('제목 또는 메뉴명 중 하나는 입력해야 합니다');
  }
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

/**
 * 기존 노트를 수정합니다.
 *
 * @param {number} id - 수정할 노트 ID
 * @param {{
 *   title?: string,
 *   menuName?: string,
 *   status?: string,
 *   [key: string]: any
 * }} data - 변경할 필드 (기존 레코드에 병합됨)
 * @returns {Promise<void>}
 * @throws {Error} 노트를 찾을 수 없는 경우
 */
export async function updateNote(id, data) {
  if (!hasStore(STORE)) throw new Error(`${STORE} store를 찾을 수 없습니다`);
  const existing = await getById(STORE, id);
  if (!existing) throw new Error('노트를 찾을 수 없습니다');
  await runTransaction([STORE], 'readwrite', tx => {
    storeOf(tx).put({ ...existing, ...buildRecord(data), id });
  });
  logWork('NOTE_UPDATE', data.title || data.menuName || existing.title || '노트 수정', { ref: id });
}

/**
 * 노트와 그 직계 자식 노트를 모두 삭제합니다.
 *
 * @param {number} id - 삭제할 노트 ID
 * @returns {Promise<void>}
 */
/**
 * 노트와 그 자식(parentId 체인)을 일괄 삭제.
 * 삭제된 원본 레코드 배열(부모 + 자식)을 반환 — 실행취소(restoreRecord)용.
 *
 * @param {number} id - 삭제할 노트 ID
 * @returns {Promise<object[]>} 삭제된 노트 원본 레코드 목록
 */
export async function deleteNote(id) {
  if (!hasStore(STORE)) throw new Error(`${STORE} store를 찾을 수 없습니다`);
  // Fetch parent + children before opening the write transaction (read-only, outside tx)
  const parent = await getById(STORE, id);
  const children = await getByIndex(STORE, 'parentId', id);
  // Delete parent and all children atomically in a single transaction
  await runTransaction([STORE], 'readwrite', tx => {
    const os = storeOf(tx);
    os.delete(id);
    for (const c of children) os.delete(c.id);
  });
  try {
    localStorage.removeItem(KEYS.NOTE_DRAFT(id));
    for (const c of children) localStorage.removeItem(KEYS.NOTE_DRAFT(c.id));
  } catch (e) { console.warn('[deleteNote] draft cleanup', e); }
  const cnt = 1 + children.length;
  logWork('DELETE', `노트 삭제: ${parent?.title || '제목 없음'}${cnt > 1 ? ` 외 ${cnt - 1}건` : ''}`, { ref: id }).catch(() => {});
  return [parent, ...children].filter(Boolean);
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
    brand:         (data.brand         || '').trim(),   // 멀티 브랜드 — 빈 값은 'main' 취급
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
    parentId:       toNullableId(data.parentId),
    tempCostCalc:   data.tempCostCalc != null ? data.tempCostCalc : null,
    linkedSampleId: data.linkedSampleId ?? null,
    photos:         Array.isArray(data.photos) ? data.photos : [],
    updatedAt:      new Date().toISOString(),
  };
}
