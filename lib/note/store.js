import {
  initSharedDB,
  sharedGetAll as getAll,
  sharedGetById as getById,
  sharedDeleteById as deleteById,
  sharedRunTransaction as runTransaction,
  sharedHasStore as hasStore,
  sharedGetByIndex as getByIndex,
} from '@/lib/db/shared';
import { logWork } from '@/lib/work-log';
import { KEYS } from '@/lib/note/keys';
import { asObjectArray, asTimestamp } from '@/lib/ui/prop-guards';
import { getActiveBrandId } from '@/lib/active-brand';
import { assertActiveAdmin } from '@/lib/auth/guard';

const STORE = 'menu_dev_notes';

const byCreatedAtDesc = (a, b) => asTimestamp(b?.createdAt) - asTimestamp(a?.createdAt);
const byCreatedAtAsc = (a, b) => asTimestamp(a?.createdAt) - asTimestamp(b?.createdAt);

function storeOf(tx) {
  return tx.objectStore(STORE);
}

/** Number로 변환 가능한 id → number, 아니면 null */
function toNullableId(val) {
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function activeBrandId() {
  return getActiveBrandId() || 'main';
}

function brandOf(row) {
  return ((row?.brand || 'main') + '').trim() || 'main';
}

function belongsToActiveBrand(row) {
  return brandOf(row) === activeBrandId();
}

function collectDescendantNotes(allNotes, parentId) {
  const childrenByParent = new Map();
  for (const note of allNotes) {
    if (note?.parentId == null) continue;
    if (!childrenByParent.has(note.parentId)) childrenByParent.set(note.parentId, []);
    childrenByParent.get(note.parentId).push(note);
  }

  const descendants = [];
  const stack = [...(childrenByParent.get(parentId) || [])];
  const seen = new Set();
  while (stack.length > 0) {
    const note = stack.shift();
    if (!note || seen.has(note.id)) continue;
    seen.add(note.id);
    descendants.push(note);
    stack.push(...(childrenByParent.get(note.id) || []));
  }
  return descendants;
}

function filterSortNotes(rows) {
  return asObjectArray(rows).filter(belongsToActiveBrand).sort(byCreatedAtDesc);
}

// ── 노트 목록 캐시 (짧은 TTL + 쓰기 무효화) ────────────────────────────
// 홈→저널→칸반 등 빠른 화면 전환에서 같은 store 스캔(getAll)을 재사용한다.
// 안전장치:
//   (1) 모든 쓰기(add/update/bulk/delete/duplicate)가 즉시 invalidateNotesCache로 무효화
//   (2) 짧은 TTL(1.5s) — 크로스탭/복원 등 store 우회 변경도 곧 자가 치유
//   (3) 무효화 세대(gen) 카운터 — in-flight 응답이 무효화 이후 캐시를 오염시키지 않음
//   (4) raw 행만 캐시하고 브랜드 필터는 호출 시점 적용 → 브랜드 전환에도 항상 정확
//   (5) getAllNotes는 캐시를 쓰지 않음(쓰기 경로·테스트의 fresh read 보장). 캐시는
//       표시 전용 getAllNotesCached에서만 사용.
const NOTES_CACHE_TTL_MS = 1500;
let notesRawCache = null;
let notesRawCacheAt = 0;
let notesInflight = null;
let notesCacheGen = 0;

export function invalidateNotesCache() {
  notesCacheGen++;
  notesRawCache = null;
  notesRawCacheAt = 0;
  notesInflight = null;
}

function readAllNoteRowsCached() {
  const now = Date.now();
  if (notesRawCache && now - notesRawCacheAt < NOTES_CACHE_TTL_MS) {
    return Promise.resolve(notesRawCache);
  }
  if (notesInflight) return notesInflight;
  const gen = notesCacheGen;
  const inflight = Promise.resolve(getAll(STORE))
    .then(async rows => {
      const arr = asObjectArray(rows);
      // 읽는 도중 무효화(쓰기)가 발생했으면 캐시에 저장하지 않는다(stale 오염 방지).
      // 호출자에게도 오래된 결과를 돌려주지 않도록 최신 세대의 읽기를 다시 따른다.
      if (gen !== notesCacheGen) {
        return readAllNoteRowsCached();
      }
      notesRawCache = arr;
      notesRawCacheAt = Date.now();
      return arr;
    })
    .finally(() => {
      if (notesInflight === inflight) {
        notesInflight = null;
      }
    });
  notesInflight = inflight;
  return inflight;
}

export async function getAllNotes() {
  await initSharedDB(); // 비-main 직접 진입 시 main DB 보장
  if (!hasStore(STORE)) return [];
  return filterSortNotes(await getAll(STORE));
}

/**
 * 표시 전용 노트 목록 — 짧은 TTL 캐시로 빠른 화면 전환 시 중복 스캔을 줄인다.
 * 쓰기가 즉시 무효화하므로 항상 최신을 보장하고, 미스 시 getAllNotes와 동일 결과.
 */
export async function getAllNotesCached() {
  await initSharedDB();
  if (!hasStore(STORE)) return [];
  return filterSortNotes(await readAllNoteRowsCached());
}

/** 배지 전용 — 전체 노트 없이 status 인덱스로만 보고예정 건수를 셈. */
export async function getReportingNoteCount() {
  await initSharedDB();
  if (!hasStore(STORE)) return 0;
  const rows = asObjectArray(await getByIndex(STORE, 'status', '보고예정'));
  return rows.filter(belongsToActiveBrand).length;
}

export async function getNoteById(id) {
  await initSharedDB();
  if (!hasStore(STORE)) return null;
  const record = await getById(STORE, id);
  return record && belongsToActiveBrand(record) ? record : null;
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
  await assertActiveAdmin('노트 추가');
  await initSharedDB();
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
    req.onsuccess = () => {
      insertedId = req.result;
    };
  });
  invalidateNotesCache();
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
  await assertActiveAdmin('노트 수정');
  await initSharedDB();
  if (!hasStore(STORE)) throw new Error(`${STORE} store를 찾을 수 없습니다`);
  const existing = await getNoteById(id);
  if (!existing) throw new Error('노트를 찾을 수 없습니다');
  await runTransaction([STORE], 'readwrite', tx => {
    // buildRecord가 brand:'' 로 덮어쓰는 것을 방지 — 부분 업데이트 시 기존 brand 보존
    const record = buildRecord({ ...existing, ...data });
    storeOf(tx).put({ ...existing, ...record, id });
  });
  invalidateNotesCache();
  logWork('NOTE_UPDATE', data.title || data.menuName || existing.title || '노트 수정', { ref: id });
}

/**
 * 여러 노트의 boardOrder를 단일 트랜잭션으로 일괄 갱신.
 * 칸반 드래그 정렬 시 중간 실패로 인한 부분 반영을 방지한다.
 *
 * @param {Array<{id: number, boardOrder: number}>} updates
 */
export async function bulkUpdateBoardOrder(updates) {
  if (!updates || updates.length === 0) return;
  await assertActiveAdmin('노트 칸반 순서 변경');
  await initSharedDB();
  if (!hasStore(STORE)) throw new Error(`${STORE} store를 찾을 수 없습니다`);
  const ids = updates.map(u => u.id);
  const all = await getAll(STORE);
  const byId = Object.fromEntries(all.filter(r => ids.includes(r.id)).map(r => [r.id, r]));
  await runTransaction([STORE], 'readwrite', tx => {
    const os = storeOf(tx);
    for (const { id, boardOrder } of updates) {
      const existing = byId[id];
      if (existing) os.put({ ...existing, boardOrder });
    }
  });
  invalidateNotesCache();
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
  await assertActiveAdmin('노트 삭제');
  await initSharedDB();
  if (!hasStore(STORE)) throw new Error(`${STORE} store를 찾을 수 없습니다`);
  // Fetch parent + children before opening the write transaction (read-only, outside tx)
  const parent = await getNoteById(id);
  if (!parent) throw new Error('노트를 찾을 수 없습니다');
  const children = collectDescendantNotes(
    asObjectArray(await getAll(STORE)).filter(belongsToActiveBrand),
    id
  );
  // Delete parent and all children atomically in a single transaction
  await runTransaction([STORE], 'readwrite', tx => {
    const os = storeOf(tx);
    os.delete(id);
    for (const c of children) os.delete(c.id);
  });
  invalidateNotesCache();
  try {
    localStorage.removeItem(KEYS.NOTE_DRAFT(id));
    for (const c of children) localStorage.removeItem(KEYS.NOTE_DRAFT(c.id));
  } catch (e) {
    console.warn('[deleteNote] draft cleanup', e);
  }
  const cnt = 1 + children.length;
  logWork(
    'DELETE',
    `노트 삭제: ${parent?.title || '제목 없음'}${cnt > 1 ? ` 외 ${cnt - 1}건` : ''}`,
    { ref: id }
  ).catch(() => {});
  return [parent, ...children].filter(Boolean);
}

/** parentId 체인 전체 반환 — 루트 → 현재 → 자손 순 */
export async function getNotesInChain(noteId) {
  await initSharedDB();
  if (!hasStore(STORE)) return [];
  const all = asObjectArray(await getAll(STORE)).filter(belongsToActiveBrand);
  const byId = new Map(all.map(n => [n.id, n]));

  const ancestors = [];
  let cur = byId.get(noteId);
  while (cur) {
    ancestors.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : null;
  }
  if (!ancestors.length) return [];

  function children(id) {
    return all.filter(n => n.parentId === id).sort(byCreatedAtAsc);
  }
  function walk(id, acc) {
    for (const c of children(id)) {
      acc.push(c);
      walk(c.id, acc);
    }
  }
  const root = ancestors[0];
  const chain = [];
  walk(root.id, chain);
  return [root, ...chain];
}

export async function duplicateNote(id) {
  await assertActiveAdmin('노트 복사');
  await initSharedDB();
  const note = await getNoteById(id);
  if (!note) throw new Error('노트를 찾을 수 없습니다');
  const now = new Date().toISOString();
  const copy = {
    ...buildRecord({ ...note, title: note.title + ' (복사)', status: '아이디어', parentId: null }),
    createdAt: now,
  };
  let insertedId = null;
  await runTransaction([STORE], 'readwrite', tx => {
    const req = storeOf(tx).add(copy);
    req.onsuccess = () => {
      insertedId = req.result;
    };
  });
  invalidateNotesCache();
  return insertedId;
}

function buildRecord(data) {
  return {
    brand: (data.brand || activeBrandId()).trim() || 'main',
    title: (data.title || '').trim(),
    menuName: (data.menuName || '').trim(),
    category: (data.category || '').trim(),
    noteType: (data.noteType || '').trim(),
    status: (data.status || '아이디어').trim(),
    testContent: (data.testContent || '').trim(),
    testDate: (data.testDate || '').trim(),
    materials: (data.materials || '').trim(),
    tasteEval: (data.tasteEval || '').trim(),
    managerEval: (data.managerEval || '').trim(),
    costNote: (data.costNote || '').trim(),
    improvements: (data.improvements || '').trim(),
    issues: (data.issues || '').trim(),
    nextAction: (data.nextAction || '').trim(),
    reportSummary: (data.reportSummary || '').trim(),
    tags: (data.tags || '').trim(),
    parentId: toNullableId(data.parentId),
    tempCostCalc: data.tempCostCalc != null ? data.tempCostCalc : null,
    linkedSampleId: data.linkedSampleId ?? null,
    photos: Array.isArray(data.photos) ? data.photos : [],
    boardOrder: data.boardOrder ?? null, // 칸반보드 열 내 순서
    updatedAt: new Date().toISOString(),
  };
}
