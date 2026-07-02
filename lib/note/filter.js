/**
 * lib/note/filter.js — 노트 목록 검색·필터·정렬 순수 로직
 *
 * UI(React)와 분리된 순수 함수 모음. 동작은 _NoteContent의 기존 인라인 로직과 동일하며
 * 단위 테스트로 보장한다. 훅(useNoteFilter)과 컴포넌트가 이 함수들을 재사용한다.
 */

import { JOURNAL_NOTE_TYPE, STATUSES, normalizeNoteStatus } from './constants';
import { noteDisplayTitle } from './display';
import { selectRepresentativeNote } from './representative';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

export const CHECKLIST_NOTE_TYPE = '체크리스트';

function searchText(value) {
  if (Array.isArray(value)) {
    return value
      .map(item => asDisplayText(item))
      .filter(Boolean)
      .join(',');
  }
  return asDisplayText(value);
}

function timeValue(value) {
  const dateValue =
    value instanceof Date || typeof value === 'number' ? value : asDisplayText(value);
  if (!dateValue) return 0;
  const time = new Date(dateValue).getTime();
  return Number.isFinite(time) ? time : 0;
}

function keyOf(value) {
  return value == null ? '' : String(value);
}

function noteRoundNumber(note = {}) {
  const source = [note.testRound, note.title, note.menuName]
    .map(value => asDisplayText(value))
    .find(Boolean);
  const match = source?.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function compareNoteRounds(a = {}, b = {}) {
  const ar = noteRoundNumber(a);
  const br = noteRoundNumber(b);
  if (ar && br && ar !== br) return ar - br;
  if (ar && !br) return -1;
  if (!ar && br) return 1;
  const dateDiff =
    (timeValue(a.testDate) || timeValue(a.createdAt) || timeValue(a.updatedAt)) -
    (timeValue(b.testDate) || timeValue(b.createdAt) || timeValue(b.updatedAt));
  if (dateDiff) return dateDiff;
  return keyOf(a.id).localeCompare(keyOf(b.id), 'ko', { numeric: true });
}

function findChainRoot(note, byId) {
  let current = note;
  const seen = new Set();

  while (current?.id != null) {
    const currentKey = keyOf(current.id);
    const parentKey = keyOf(current.parentId);
    if (!parentKey || seen.has(parentKey)) break;
    seen.add(currentKey);
    const parent = byId.get(parentKey);
    if (!parent) break;
    current = parent;
  }

  return current || note;
}

function buildNoteStatusGroups(notes) {
  const list = asObjectArray(notes);
  const byId = new Map();
  const parentIds = new Set();

  list.forEach(note => {
    const id = keyOf(note?.id);
    const parentId = keyOf(note?.parentId);
    if (id) byId.set(id, note);
    if (parentId) parentIds.add(parentId);
  });

  const groups = new Map();
  list.forEach((note, index) => {
    const id = keyOf(note?.id);
    const parentId = keyOf(note?.parentId);
    const root = findChainRoot(note, byId);
    const rootId = keyOf(root?.id);
    const isChained = Boolean(parentId || parentIds.has(id) || (rootId && rootId !== id));
    const key = isChained
      ? `chain:${rootId || parentId || id || index}`
      : `note:${id || index}`;

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(note);
  });

  return [...groups.values()].map(group => {
    const ordered = [...group].sort(compareNoteRounds);
    const latest = selectRepresentativeNote(ordered) || {};
    return {
      notes: ordered,
      status: normalizeNoteStatus(latest.status),
    };
  });
}

export function buildEffectiveNoteStatusById(notes) {
  const map = new Map();
  for (const group of buildNoteStatusGroups(notes)) {
    for (const note of group.notes) {
      if (note?.id != null) map.set(note.id, group.status);
    }
  }
  return map;
}

export function isChecklistNote(note) {
  return asDisplayText(note?.noteType) === CHECKLIST_NOTE_TYPE;
}

export function isJournalNote(note) {
  return asDisplayText(note?.noteType) === JOURNAL_NOTE_TYPE;
}

export function filterNoteListNotes(notes) {
  return asObjectArray(notes).filter(note => !isChecklistNote(note) && !isJournalNote(note));
}

export function filterKanbanNotes(notes) {
  return asObjectArray(notes).filter(note => !isChecklistNote(note) && !isJournalNote(note));
}

/**
 * 검색 인덱스 생성: note.id → 검색 대상 필드를 소문자로 합친 문자열.
 * 키 입력마다 전체 toLowerCase 반복을 피하기 위해 notes 변경 시 1회만 빌드한다.
 * @param {Array<object>} notes
 * @returns {Map<any, string>}
 */
export function buildNoteSearchIndex(notes) {
  const m = new Map();
  for (const n of asObjectArray(notes)) {
    const parts = [
      searchText(n.title),
      searchText(n.menuName),
      searchText(n.testContent),
      searchText(n.tags),
    ];
    const menuCode = searchText(n.menuCode);
    if (menuCode) parts.unshift(menuCode);
    m.set(n.id, parts.join('\n').toLowerCase());
  }
  return m;
}

/**
 * 상태별 노트 개수( + 전체 'all' ). 등장하지 않은 상태는 0으로 채운다.
 * @param {Array<object>} notes
 * @param {string[]} [statuses=STATUSES]
 * @returns {Record<string, number>}
 */
export function countNotesByStatus(notes, statuses = STATUSES) {
  const groups = buildNoteStatusGroups(notes);
  const m = groups.reduce(
    (acc, n) => {
      const status = normalizeNoteStatus(n.status);
      if (status) acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    { all: groups.length }
  );
  for (const s of statuses) if (!(s in m)) m[s] = 0;
  return m;
}

/**
 * 상태 필터 + 검색 + 정렬을 적용한 새 배열을 반환.
 * 기본 최신순에서는 고정 항목을 상단에 두지만, 사용자가 명시적으로 날짜순/제목순을
 * 선택한 경우에는 선택한 정렬 기준을 그대로 따른다.
 * @param {Array<object>} notes
 * @param {object} opts
 * @param {string} [opts.statusFilter='all']
 * @param {string} [opts.brandFilter='all']   - 'all' | 브랜드 id. 빈 brand 레코드는 'main' 취급
 * @param {string} [opts.search='']
 * @param {string} [opts.sortBy='createdAt']  - 'menuName' | 'testDate' | 그 외(createdAt 내림차순)
 * @param {Set<any>|Array<any>} [opts.pinnedIds]  - 상단 고정할 note.id 집합
 * @param {Map<any,string>} [opts.searchIndex]    - 미전달 시 즉석 생성
 * @returns {Array<object>}
 */
export function filterSortNotes(
  notes,
  {
    statusFilter = 'all',
    brandFilter = 'all',
    search = '',
    sortBy = 'createdAt',
    pinnedIds,
    searchIndex,
  } = {}
) {
  const all = asObjectArray(notes);
  const pinned = pinnedIds instanceof Set ? pinnedIds : new Set(pinnedIds || []);
  const idx = searchIndex || buildNoteSearchIndex(all);
  const effectiveStatusById = buildEffectiveNoteStatusById(all);

  const rawStatusFilter = asDisplayText(statusFilter, 'all') || 'all';
  const safeStatusFilter = rawStatusFilter === 'all' ? 'all' : normalizeNoteStatus(rawStatusFilter);
  const safeBrandFilter = asDisplayText(brandFilter, 'all') || 'all';
  let list =
    safeStatusFilter === 'all'
      ? all
      : all.filter(n => effectiveStatusById.get(n.id) === safeStatusFilter);
  if (safeBrandFilter !== 'all') {
    list = list.filter(n => (asDisplayText(n.brand) || 'main') === safeBrandFilter);
  }
  const q = asDisplayText(search).trim().toLowerCase();
  if (q) list = list.filter(n => (idx.get(n.id) || '').includes(q));

  return [...list].sort((a, b) => {
    if (sortBy === 'createdAt') {
      const ap = pinned.has(a.id) ? 0 : 1;
      const bp = pinned.has(b.id) ? 0 : 1;
      if (ap !== bp) return ap - bp;
    }
    if (sortBy === 'menuName') return noteDisplayTitle(a).localeCompare(noteDisplayTitle(b), 'ko');
    if (sortBy === 'testDate')
      return asDisplayText(b.testDate).localeCompare(asDisplayText(a.testDate));
    return timeValue(b.createdAt) - timeValue(a.createdAt);
  });
}
